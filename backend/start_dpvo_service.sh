#!/bin/bash
# Start DPVO service in WSL Ubuntu
# Usage: ./start_dpvo_service.sh

echo "🚀 Starting DPVO Microservice for PULSE..."
echo ""

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Please install Miniconda or Anaconda."
    exit 1
fi

# Activate conda environment
echo "📦 Activating conda environment 'dpvo'..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate dpvo

if [ $? -ne 0 ]; then
    echo "❌ Failed to activate conda environment 'dpvo'"
    echo "   Create it with: conda create -n dpvo python=3.10"
    exit 1
fi

# Check if Flask is installed
if ! python -c "import flask" 2>/dev/null; then
    echo "📥 Installing Flask..."
    pip install flask numpy opencv-python pillow
fi

# Check if DPVO is installed
if ! python -c "import dpvo" 2>/dev/null; then
    echo "❌ DPVO not found in conda environment"
    echo "   Install with: pip install dpvo"
    exit 1
fi

# Check CUDA availability
echo "🔍 Checking CUDA..."
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"

# Start service
echo ""
echo "✅ Starting DPVO service on http://0.0.0.0:5555"
echo "   Windows backend will connect via http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python dpvo_service.py
