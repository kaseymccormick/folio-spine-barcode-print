import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, CameraOff, Keyboard, Search, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  isLoading: boolean;
}

declare class BarcodeDetector {
  constructor(options: { formats: string[] });
  detect(source: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

export function BarcodeScanner({ onScan, isLoading }: BarcodeScannerProps) {
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [manualInput, setManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [barcodeDetectorAvailable, setBarcodeDetectorAvailable] = useState(false);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      setBarcodeDetectorAvailable(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
    scannedRef.current = false;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    scannedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setScanning(true);

        if (barcodeDetectorAvailable) {
          const detector = new BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
          });
          intervalRef.current = window.setInterval(async () => {
            if (scannedRef.current) return;
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && !scannedRef.current) {
                  scannedRef.current = true;
                  const isbn = barcodes[0].rawValue;
                  stopCamera();
                  onScan(isbn);
                }
              } catch {
                // detection frame errors are normal
              }
            }
          }, 250);
        }
      }
    } catch {
      setCameraError("Camera access denied or unavailable. Use manual entry below.");
      setCameraActive(false);
    }
  }, [barcodeDetectorAvailable, onScan, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [mode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isbn = manualInput.trim().replace(/[-\s]/g, "");
    if (isbn) {
      onScan(isbn);
      setManualInput("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex border border-border overflow-hidden" style={{ borderRadius: 0 }}>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 text-sm flex-1 transition-colors ${
            mode === "manual"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Keyboard size={14} />
          Manual / USB Scanner
        </button>
        <button
          onClick={() => setMode("camera")}
          className={`flex items-center gap-2 px-4 py-2 text-sm flex-1 transition-colors border-l border-border ${
            mode === "camera"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Camera size={14} />
          Camera
        </button>
      </div>

      {mode === "manual" && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Scan barcode or type ISBN…"
            disabled={isLoading}
            autoFocus
            className="flex-1 px-3 py-2 border border-border bg-input-background text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0, fontFamily: "'JetBrains Mono', monospace" }}
          />
          <button
            type="submit"
            disabled={isLoading || !manualInput.trim()}
            className="px-4 py-2 bg-accent text-accent-foreground text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
            style={{ borderRadius: 0 }}
          >
            <Search size={14} />
            Look Up
          </button>
        </form>
      )}

      {mode === "camera" && (
        <div className="space-y-3">
          <div className="relative bg-black border border-border overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-sm">Starting camera…</div>
              </div>
            )}
            {cameraActive && (
              <>
                {/* Scan reticle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-24">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent" />
                    {!barcodeDetectorAvailable && (
                      <div className="absolute -bottom-8 left-0 right-0 text-center text-white text-xs opacity-70">
                        BarcodeDetector not supported. Enter ISBN manually.
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={stopCamera}
                  className="absolute top-2 right-2 bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  <X size={14} />
                </button>
              </>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center px-4">
                  <CameraOff size={24} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-white text-sm">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
          {cameraActive && (
            <p className="text-xs text-muted-foreground text-center">
              {barcodeDetectorAvailable
                ? "Point camera at barcode — scanning automatically"
                : "BarcodeDetector API not available in this browser. Try Chrome or Edge."}
            </p>
          )}
          {/* Manual fallback in camera mode */}
          {(cameraError || !barcodeDetectorAvailable) && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ISBN manually…"
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ borderRadius: 0, fontFamily: "'JetBrains Mono', monospace" }}
              />
              <button
                type="submit"
                disabled={isLoading || !manualInput.trim()}
                className="px-4 py-2 bg-accent text-accent-foreground text-sm hover:opacity-90 disabled:opacity-40"
                style={{ borderRadius: 0 }}
              >
                <Search size={14} />
              </button>
            </form>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 border border-accent border-t-transparent animate-spin" style={{ borderRadius: "50%" }} />
          Fetching book data…
        </div>
      )}
    </div>
  );
}
