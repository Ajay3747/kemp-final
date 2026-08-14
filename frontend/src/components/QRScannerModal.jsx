import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, RotateCcw, ScanLine } from 'lucide-react';

const API_URL = "http://localhost:5000/api/orders";

// In-app camera scanner for the buyer's side of QR handover confirmation.
// The QR still just encodes a plain URL (/confirm-handover/:orderId?code=...),
// so scanning it with a phone's native camera app keeps working exactly as
// before — this is a convenience layer on top, not a replacement.
export default function QRScannerModal({ order, onClose, onConfirmed }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // 'starting' | 'scanning' | 'confirming' | 'error' | 'unsupported'
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      setStatus('unsupported');
      return;
    }

    let stream = null;
    let animationId = null;
    let cancelled = false;

    const stopCamera = () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };

    const handleDecoded = async (text) => {
      stopCamera();
      try {
        const url = new URL(text);
        const match = url.pathname.match(/\/confirm-handover\/([^/]+)/);
        const scannedOrderId = match ? match[1] : null;
        const code = url.searchParams.get('code');

        if (!scannedOrderId || !code) {
          setError("That QR code isn't a KEMP handover code.");
          setStatus('error');
          return;
        }
        if (scannedOrderId !== order._id) {
          setError("This QR is for a different order — make sure you're scanning the right seller.");
          setStatus('error');
          return;
        }

        setStatus('confirming');
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/${order._id}/confirm-handover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to confirm handover.');
        onConfirmed(data.order);
      } catch (err) {
        setError(err.message || 'Invalid QR code.');
        setStatus('error');
      }
    };

    const scanLoop = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDecoded(code.data);
          return;
        }
      }
      animationId = requestAnimationFrame(scanLoop);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('scanning');
        scanLoop();
      } catch (err) {
        setError("Couldn't access the camera — check your browser's camera permission for this site.");
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [order, onConfirmed, retryKey]);

  const tryAgain = () => {
    setError('');
    setStatus('starting');
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-sm p-6 border border-white/10 shadow-2xl text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <Camera size={18} /> Scan Seller's QR
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {status === 'unsupported' ? (
          <p className="text-white/60 text-sm">
            In-app camera scanning isn't supported on this device/browser. You can still scan the seller's QR with your phone's regular camera app instead.
          </p>
        ) : (
          <>
            <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {(status === 'scanning' || status === 'starting') && (
                <div className="absolute inset-6 border-2 border-yellow-400/70 rounded-xl pointer-events-none" />
              )}

              {status === 'confirming' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
                  <p className="text-white text-sm font-semibold">Confirming...</p>
                </div>
              )}
            </div>

            <p className="text-white/50 text-xs mt-3 flex items-center justify-center gap-1.5">
              <ScanLine size={13} /> Point the camera at the seller's QR code
            </p>

            {status === 'error' && (
              <div className="mt-4 space-y-3">
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={tryAgain}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition"
                >
                  <RotateCcw size={16} /> Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
