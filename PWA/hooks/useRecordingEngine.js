import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation } from '@react-navigation/native';

import { useIMU } from './useIMU';
import { useGPS } from './useGPS';
import { useCamera } from './useCamera';
import { useAudio } from './useAudio';

import wsClient from '../services/WebSocketClient';
import { saveSegment, createSession, finalizeSession } from '../services/OfflineBuffer';
import { pushSample, computeRollingIRI, resetIRIEstimator } from '../utils/iriEstimate';

const SESSION_ID_PREFIX = 'pulse_';

const INITIAL_DISPLAY = {
    accelZ: 0,
    currentIRI: null,
    isSpeedValid: false,
    speedKmh: 0,
    distanceM: 0,
    gpsCoords: null,
    audioRMS: 0,
    currentSegmentDistance: 0,
    elapsedSeconds: 0,
    wsStatus: 'off',
};

export function useRecordingEngine({ sessionName, serverHost, segmentLengthM, isTestMode }) {
    const navigation = useNavigation();

    const [isRecording, setIsRecording] = useState(false);
    const [display, setDisplay] = useState(INITIAL_DISPLAY);
    const [completedSegments, setCompletedSegments] = useState([]);
    const [queueSize, setQueueSize] = useState(0);

    const refs = useRef({
        isRecording: false,
        isStopping: false,
        sessionId: null,
        sessionStartTime: null,
        accelZ: 0,
        audioRMS: 0,
        speedKmh: 0,
        distanceM: 0,
        isSpeedValid: false,
        gpsCoords: null,
        segmentDist: 0,
        currentIRI: null,
        completedSegments: [],
        segmentStartDist: 0,
        segmentIndex: 0,
        wsStatus: 'off',
        elapsedSeconds: 0,
    }).current;

    const elapsedTimer = useRef(null);
    const displayTimer = useRef(null);
    const iriTimer = useRef(null);
    const segIndexRef = useRef(0);

    const startDisplayTimer = useCallback(() => {
        if (displayTimer.current) return;
        displayTimer.current = setInterval(() => {
            setDisplay({
                accelZ: refs.accelZ,
                currentIRI: refs.currentIRI,
                isSpeedValid: refs.isSpeedValid,
                speedKmh: refs.speedKmh,
                distanceM: refs.distanceM,
                gpsCoords: refs.gpsCoords,
                audioRMS: refs.audioRMS,
                currentSegmentDistance: refs.segmentDist,
                elapsedSeconds: refs.elapsedSeconds,
                wsStatus: refs.wsStatus,
            });
        }, 150);
    }, []);

    const stopDisplayTimer = useCallback(() => {
        if (displayTimer.current) {
            clearInterval(displayTimer.current);
            displayTimer.current = null;
        }
    }, []);

    const imu = useIMU({
        enabled: isRecording,
        onSample: useCallback((packet) => {
            if (!refs.isRecording) return;
            refs.accelZ = packet.az - 9.81;
            pushSample(packet.az, refs.speedKmh);
            wsClient.send(packet);
        }, []),
    });

    const gps = useGPS({
        enabled: isRecording,
        isTestMode: isTestMode,
        onSample: useCallback((packet) => {
            if (!refs.isRecording) return;
            refs.speedKmh = packet.speed_kmh;
            refs.isSpeedValid = packet.speed_kmh >= 20;
            refs.distanceM = packet.distance_m;
            refs.gpsCoords = { lat: packet.lat, lng: packet.lng };
            refs.segmentDist = packet.distance_m - refs.segmentStartDist;
            if (refs.segmentDist >= segmentLengthM) {
                refs.segmentStartDist = packet.distance_m;
            }
            wsClient.send(packet);
        }, [segmentLengthM]),
    });

    const camera = useCamera({
        enabled: isRecording,
        onFrame: useCallback((packet) => {
            if (!refs.isRecording) return;
            wsClient.send(packet);
        }, []),
    });

    const audio = useAudio({
        enabled: isRecording,
        onSample: useCallback((packet) => {
            if (!refs.isRecording) return;
            refs.audioRMS = packet.rms;
            wsClient.send(packet);
        }, []),
    });

    useEffect(() => {
        wsClient.onConnected = () => { refs.wsStatus = 'connected'; };
        wsClient.onDisconnected = () => { refs.wsStatus = 'disconnected'; };
        wsClient.onSegmentComplete = handleSegmentComplete;
        wsClient.onQueueDrain = () => setQueueSize(0);
        return () => {
            wsClient.onConnected = null;
            wsClient.onDisconnected = null;
            wsClient.onSegmentComplete = null;
            wsClient.onQueueDrain = null;
        };
    }, []);

    useEffect(() => {
        const t = setInterval(() => setQueueSize(wsClient.getStatus().queueSize), 2000);
        return () => clearInterval(t);
    }, []);

    async function handleSegmentComplete(segment) {
        const seg = { ...segment, segment_index: refs.segmentIndex };
        refs.segmentIndex++;
        segIndexRef.current = refs.segmentIndex;
        refs.completedSegments = [...refs.completedSegments, seg];
        setCompletedSegments([...refs.completedSegments]);
        if (refs.sessionId) {
            await saveSegment(refs.sessionId, seg.segment_index, seg);
        }
    }

    async function startRecording() {
        if (refs.isRecording) return;

        refs.isRecording = true;
        refs.isStopping = false;
        setIsRecording(true);

        const newSessionId = SESSION_ID_PREFIX + Date.now();
        refs.sessionId = newSessionId;
        refs.accelZ = 0;
        refs.audioRMS = 0;
        refs.speedKmh = 0;
        refs.distanceM = 0;
        refs.isSpeedValid = false;
        refs.gpsCoords = null;
        refs.segmentDist = 0;
        refs.currentIRI = null;
        refs.completedSegments = [];
        refs.segmentStartDist = 0;
        refs.segmentIndex = 0;
        refs.elapsedSeconds = 0;
        refs.wsStatus = 'connecting';
        segIndexRef.current = 0;

        setCompletedSegments([]);
        setDisplay({ ...INITIAL_DISPLAY, wsStatus: 'connecting' });

        gps.resetDistance();
        resetIRIEstimator();

        await createSession({ id: newSessionId, name: sessionName, serverHost });

        wsClient.connect(serverHost, newSessionId);
        await activateKeepAwakeAsync();
        refs.sessionStartTime = Date.now();

        elapsedTimer.current = setInterval(() => {
            refs.elapsedSeconds = Math.floor((Date.now() - refs.sessionStartTime) / 1000);
        }, 1000);

        iriTimer.current = setInterval(() => {
            const newIRI = computeRollingIRI();
            refs.currentIRI = newIRI;
            if (newIRI !== null) {
                wsClient.send({
                    type: 'IRI',
                    iri_value: newIRI,
                    timestamp: Date.now()
                });
            }
        }, 500);

        startDisplayTimer();
    }

    function stopRecording() {
        Alert.alert('Stop Recording', 'End this session and save all data?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Stop & Save', style: 'destructive', onPress: confirmStop },
        ]);
    }

    async function confirmStop() {
        if (refs.isStopping) return;
        refs.isStopping = true;
        refs.isRecording = false;

        setIsRecording(false);
        stopDisplayTimer();

        clearInterval(elapsedTimer.current); elapsedTimer.current = null;
        clearInterval(iriTimer.current); iriTimer.current = null;

        wsClient.disconnect();
        refs.wsStatus = 'off';
        deactivateKeepAwake();

        try {
            if (refs.sessionId) {
                const segs = refs.completedSegments;
                const avgIRI = segs.length > 0
                    ? segs.reduce((s, seg) => s + (seg.iri_value || 0), 0) / segs.length
                    : null;
                await finalizeSession(refs.sessionId, {
                    distanceM: refs.distanceM,
                    segmentCount: segs.length,
                    avgIRI,
                });
            }
        } catch (e) {
            console.error('[Stop] finalizeSession failed:', e);
        }

        navigation.replace('History');
    }

    const sensorStatuses = {
        imu: imu.isActive ? 'active' : isRecording ? 'error' : 'off',
        gps: gps.isActive ? (display.isSpeedValid ? 'active' : 'degraded') : isRecording ? 'error' : 'off',
        camera: camera.isActive ? 'active' : isRecording ? 'degraded' : 'off',
        audio: audio.isActive ? 'active' : isRecording ? 'degraded' : 'off',
        ws: display.wsStatus === 'connected' ? 'active' : display.wsStatus === 'connecting' ? 'degraded' : display.wsStatus === 'disconnected' ? 'error' : 'off',
    };

    return {
        isRecording,
        display,
        completedSegments,
        queueSize,
        segIndex: segIndexRef.current,
        sensorStatuses,
        imu,
        camera,
        startRecording,
        stopRecording
    };
}
