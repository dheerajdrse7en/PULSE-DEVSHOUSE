/**
 * useCamera — Rear camera frame capture at 2fps
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from 'expo-camera';
import { Platform } from 'react-native';

const FRAME_INTERVAL_MS = 1200; // Increased delay to prevent native memory exhaustion crashes
const FRAME_QUALITY = 0.5; // lower quality for faster base64 encoding

export function useCamera({ onFrame, enabled = false }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [pictureSize, setPictureSize] = useState(undefined);

  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const cameraRef = useRef(null);
  const frameTimer = useRef(null);
  const isCaptureActive = useRef(false);

  useEffect(() => {
    async function requestPermission() {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }
    requestPermission();
  }, []);

  useEffect(() => {
    if (enabled && isReady && hasPermission) startCapture();
    else stopCapture();
    return () => stopCapture();
  }, [enabled, isReady, hasPermission]);

  function startCapture() {
    if (isCaptureActive.current) return;
    isCaptureActive.current = true;

    async function captureLoop() {
      if (!isCaptureActive.current || !cameraRef.current) return;

      try {
        // Do NOT use skipProcessing: true on Android if you want it to natively downscale!
        // True skips orientation AND resolution constraints. False forces it to honor pictureSize.
        const photo = await cameraRef.current.takePictureAsync({
          quality: FRAME_QUALITY,
          base64: true, 
          skipProcessing: false, // Essential to ensure native pictureSize downscaling
          exif: false,
          shutterSound: false,
        });

        if (photo?.base64 && onFrameRef.current) {
          onFrameRef.current({
            type: 'CAMERA',
            timestamp: Date.now(),
            image: photo.base64,
            width: photo.width || 640,
            height: photo.height || 480
          });
        }
      } catch (e) {
        console.warn('Camera capture loop error:', e);
      }

      if (isCaptureActive.current) {
        frameTimer.current = setTimeout(captureLoop, FRAME_INTERVAL_MS);
      }
    }

    captureLoop();
  }

  function stopCapture() {
    isCaptureActive.current = false;
    if (frameTimer.current) {
      clearTimeout(frameTimer.current);
      frameTimer.current = null;
    }
  }

  const handleCameraReady = useCallback(async () => {
    if (cameraRef.current && Platform.OS !== 'web') {
      try {
        const sizes = await cameraRef.current.getAvailablePictureSizesAsync('4:3');
        if (sizes && sizes.length > 0) {
          // Sort by area ascending to find the smallest natively supported hardware resolution
          const sorted = sizes.sort((a, b) => {
            const [wA, hA] = a.split('x').map(Number);
            const [wB, hB] = b.split('x').map(Number);
            return (wA * hA) - (wB * hB);
          });
          setPictureSize(sorted[0]);
        }
      } catch (e) {
        console.warn('Failed to query sizes', e);
      }
    }
    setIsReady(true);
  }, []);

  return {
    hasPermission,
    isReady,
    cameraRef,
    handleCameraReady,
    pictureSize,
    isActive: enabled && isReady && hasPermission,
  };
}