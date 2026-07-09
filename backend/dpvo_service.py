"""
DPVO Microservice for PULSE
Runs in WSL Ubuntu conda environment, serves Windows backend via HTTP

Usage:
    1. In WSL Ubuntu: conda activate dpvo
    2. python dpvo_service.py
    3. Service runs on http://0.0.0.0:5555
    4. Windows backend connects via http://localhost:5555

See DPVO_WSL_INTEGRATION.md for full setup guide.
"""

from flask import Flask, request, jsonify
import numpy as np
import torch
import cv2
import base64
from io import BytesIO
from PIL import Image
import logging

# Initialize Flask
app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DPVO
dpvo_instance = None
frame_count = 0

def init_dpvo():
    """Initialize DPVO on first request (lazy loading)"""
    global dpvo_instance
    if dpvo_instance is None:
        try:
            from dpvo.dpvo import DPVO
            dpvo_instance = DPVO(
                cfg="config/default.yaml",
                network="dpvo.pth",
                viz=False
            )
            logger.info("✓ DPVO initialized successfully")
        except Exception as e:
            logger.error(f"✗ DPVO initialization failed: {e}")
            dpvo_instance = None
    return dpvo_instance is not None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "dpvo_loaded": dpvo_instance is not None,
        "frames_processed": frame_count
    })

@app.route('/process_frame', methods=['POST'])
def process_frame():
    """Process a single frame with DPVO"""
    global frame_count
    
    try:
        if not init_dpvo():
            return jsonify({"success": False, "error": "DPVO not initialized"}), 500
        
        data = request.get_json()
        frame_b64 = data.get('frame')
        timestamp = data.get('timestamp', 0.0)
        intrinsics_dict = data.get('intrinsics', {})
        
        # Decode frame
        frame_bytes = base64.b64decode(frame_b64)
        image = Image.open(BytesIO(frame_bytes))
        frame = np.array(image)
        
        # Convert BGR to RGB if needed
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Prepare intrinsics tensor
        fx = intrinsics_dict.get('fx', frame.shape[1] * 0.8)
        fy = intrinsics_dict.get('fy', frame.shape[0] * 0.8)
        cx = intrinsics_dict.get('cx', frame.shape[1] / 2.0)
        cy = intrinsics_dict.get('cy', frame.shape[0] / 2.0)
        intrinsics = torch.tensor([fx, fy, cx, cy], dtype=torch.float32)
        
        # Convert frame to tensor
        frame_tensor = torch.from_numpy(frame).permute(2, 0, 1).float().unsqueeze(0) / 255.0
        
        # Process with DPVO
        dpvo_instance(frame_tensor, intrinsics, timestamp)
        poses, _ = dpvo_instance.terminate()
        
        # Extract scale
        scale = None
        if poses is not None and len(poses) > 1:
            translation = poses[-1, :3, 3]
            scale = float(np.linalg.norm(translation))
            if scale < 0.001:
                scale = None
        
        frame_count += 1
        
        return jsonify({
            "success": True,
            "scale": scale,
            "frames_processed": frame_count
        })
        
    except Exception as e:
        logger.error(f"Frame processing error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/reset', methods=['POST'])
def reset():
    """Reset DPVO state for new session"""
    global dpvo_instance, frame_count
    dpvo_instance = None
    frame_count = 0
    return jsonify({"success": True, "message": "DPVO reset"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, debug=False)
