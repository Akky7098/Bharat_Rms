
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_RECORDING_SECONDS = 300;

const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

const formatDuration = (
  totalSeconds = 0
) => {
  const safeSeconds = Math.max(
    Number(totalSeconds || 0),
    0
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const seconds =
    safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const getSupportedMimeType = () => {
  if (
    typeof MediaRecorder ===
      "undefined" ||
    typeof MediaRecorder
      .isTypeSupported !== "function"
  ) {
    return "";
  }

  return (
    AUDIO_MIME_TYPES.find(
      (mimeType) =>
        MediaRecorder.isTypeSupported(
          mimeType
        )
    ) || ""
  );
};

const getAudioExtension = (
  mimeType = ""
) => {
  const normalizedMime =
    String(mimeType).toLowerCase();

  if (
    normalizedMime.includes("mp4")
  ) {
    return "m4a";
  }

  if (
    normalizedMime.includes("ogg")
  ) {
    return "ogg";
  }

  if (
    normalizedMime.includes("mpeg") ||
    normalizedMime.includes("mp3")
  ) {
    return "mp3";
  }

  if (
    normalizedMime.includes("wav")
  ) {
    return "wav";
  }

  return "webm";
};

const OrderTrackingAudioRecorder = ({
  disabled = false,
  onChange,
  resetKey = 0,
}) => {
  const recorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const timerRef =
    useRef(null);

  const recordedSecondsRef =
    useRef(0);

  const previewUrlRef =
    useRef("");

  const mountedRef =
    useRef(true);

  const [recordingState, setRecordingState] =
    useState("idle");

  const [seconds, setSeconds] =
    useState(0);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [recordedFile, setRecordedFile] =
    useState(null);

  const [error, setError] =
    useState("");

  const isRecording =
    recordingState === "recording";

  const isPaused =
    recordingState === "paused";

  const hasRecording =
    Boolean(
      recordedFile &&
        previewUrl
    );

  const clearTimer =
    useCallback(() => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }
    }, []);

  const stopMediaStream =
    useCallback(() => {
      const stream =
        streamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch (trackError) {
              console.error(
                "AUDIO TRACK STOP ERROR:",
                trackError
              );
            }
          });
      }

      streamRef.current = null;
    }, []);

  const revokePreviewUrl =
    useCallback(() => {
      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );

        previewUrlRef.current =
          "";
      }
    }, []);

  const resetRecorderState =
    useCallback(
      (
        notifyParent = true
      ) => {
        clearTimer();
        stopMediaStream();
        revokePreviewUrl();

        recorderRef.current =
          null;

        chunksRef.current = [];

        recordedSecondsRef.current =
          0;

        if (mountedRef.current) {
          setRecordingState(
            "idle"
          );

          setSeconds(0);
          setPreviewUrl("");
          setRecordedFile(null);
          setError("");
        }

        if (notifyParent) {
          onChange?.(null);
        }
      },
      [
        clearTimer,
        onChange,
        revokePreviewUrl,
        stopMediaStream,
      ]
    );

  const buildRecordedAudio =
    useCallback(
      (
        recorder,
        mimeType
      ) => {
        if (
          !chunksRef.current
            .length
        ) {
          resetRecorderState();
          setError(
            "No audio was captured. Please record again."
          );

          return;
        }

        const finalMimeType =
          recorder?.mimeType ||
          mimeType ||
          "audio/webm";

        const blob = new Blob(
          chunksRef.current,
          {
            type: finalMimeType,
          }
        );

        if (!blob.size) {
          resetRecorderState();
          setError(
            "No audio was captured. Please record again."
          );

          return;
        }

        const extension =
          getAudioExtension(
            finalMimeType
          );

        const file = new File(
          [blob],
          `order_audio_${Date.now()}.${extension}`,
          {
            type: finalMimeType,
            lastModified:
              Date.now(),
          }
        );

        revokePreviewUrl();

        const nextPreviewUrl =
          URL.createObjectURL(
            blob
          );

        previewUrlRef.current =
          nextPreviewUrl;

        if (
          mountedRef.current
        ) {
          setRecordedFile(file);
          setPreviewUrl(
            nextPreviewUrl
          );

          setSeconds(
            recordedSecondsRef.current
          );

          setRecordingState(
            "ready"
          );
        }

        onChange?.({
          file,
          durationSeconds:
            recordedSecondsRef.current,
          mimeType:
            finalMimeType,
          fileName: file.name,
          size: file.size,
        });

        stopMediaStream();
      },
      [
        onChange,
        resetRecorderState,
        revokePreviewUrl,
        stopMediaStream,
      ]
    );

  const stopRecording =
    useCallback(() => {
      clearTimer();

      const recorder =
        recorderRef.current;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        try {
          recorder.stop();
        } catch (stopError) {
          console.error(
            "AUDIO RECORDING STOP ERROR:",
            stopError
          );

          resetRecorderState();

          setError(
            "Unable to stop the audio recording."
          );
        }
      } else {
        stopMediaStream();

        if (
          mountedRef.current
        ) {
          setRecordingState(
            "idle"
          );
        }
      }
    }, [
      clearTimer,
      resetRecorderState,
      stopMediaStream,
    ]);

  const startTimer =
    useCallback(() => {
      clearTimer();

      timerRef.current =
        setInterval(() => {
          recordedSecondsRef.current +=
            1;

          if (
            mountedRef.current
          ) {
            setSeconds(
              recordedSecondsRef.current
            );
          }

          if (
            recordedSecondsRef.current >=
            MAX_RECORDING_SECONDS
          ) {
            stopRecording();
          }
        }, 1000);
    }, [
      clearTimer,
      stopRecording,
    ]);

  const startRecording =
    async () => {
      if (disabled) {
        return;
      }

      setError("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia ||
        typeof MediaRecorder ===
          "undefined"
      ) {
        setError(
          "Audio recording is not supported in this browser."
        );

        return;
      }

      resetRecorderState(false);

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                echoCancellation:
                  true,
                noiseSuppression:
                  true,
                autoGainControl:
                  true,
              },
            }
          );

        streamRef.current =
          stream;

        const supportedMimeType =
          getSupportedMimeType();

        const recorder =
          supportedMimeType
            ? new MediaRecorder(
                stream,
                {
                  mimeType:
                    supportedMimeType,
                  audioBitsPerSecond:
                    128000,
                }
              )
            : new MediaRecorder(
                stream
              );

        recorderRef.current =
          recorder;

        chunksRef.current = [];

        recordedSecondsRef.current =
          0;

        setSeconds(0);

        recorder.ondataavailable =
          (event) => {
            if (
              event.data &&
              event.data.size > 0
            ) {
              chunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onerror =
          (event) => {
            console.error(
              "AUDIO RECORDER ERROR:",
              event?.error ||
                event
            );

            resetRecorderState();

            setError(
              "Audio recording failed. Please try again."
            );
          };

        recorder.onstop = () => {
          clearTimer();

          buildRecordedAudio(
            recorder,
            supportedMimeType
          );
        };

        recorder.start(250);

        setRecordingState(
          "recording"
        );

        startTimer();
      } catch (recordingError) {
        console.error(
          "START AUDIO RECORDING ERROR:",
          recordingError
        );

        stopMediaStream();

        setRecordingState(
          "idle"
        );

        if (
          recordingError?.name ===
          "NotAllowedError"
        ) {
          setError(
            "Microphone permission was denied. Please allow microphone access."
          );
        } else if (
          recordingError?.name ===
          "NotFoundError"
        ) {
          setError(
            "No microphone was found on this device."
          );
        } else if (
          recordingError?.name ===
          "NotReadableError"
        ) {
          setError(
            "The microphone is currently being used by another application."
          );
        } else {
          setError(
            "Unable to start audio recording."
          );
        }
      }
    };

  const pauseRecording = () => {
    const recorder =
      recorderRef.current;

    if (
      !recorder ||
      recorder.state !==
        "recording"
    ) {
      return;
    }

    try {
      recorder.pause();

      clearTimer();

      setRecordingState(
        "paused"
      );
    } catch (pauseError) {
      console.error(
        "PAUSE AUDIO ERROR:",
        pauseError
      );

      setError(
        "Unable to pause the recording."
      );
    }
  };

  const resumeRecording = () => {
    const recorder =
      recorderRef.current;

    if (
      !recorder ||
      recorder.state !==
        "paused"
    ) {
      return;
    }

    try {
      recorder.resume();

      setRecordingState(
        "recording"
      );

      startTimer();
    } catch (resumeError) {
      console.error(
        "RESUME AUDIO ERROR:",
        resumeError
      );

      setError(
        "Unable to resume the recording."
      );
    }
  };

  const cancelRecording = () => {
    clearTimer();

    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state !==
        "inactive"
    ) {
      recorder.onstop = null;

      try {
        recorder.stop();
      } catch (cancelError) {
        console.error(
          "CANCEL AUDIO ERROR:",
          cancelError
        );
      }
    }

    resetRecorderState();
  };

  const removeRecording = () => {
    resetRecorderState();
  };

  useEffect(() => {
    resetRecorderState();

    // resetKey is intentionally used
    // to clear the recording after send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current =
        false;

      clearTimer();

      const recorder =
        recorderRef.current;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        recorder.onstop = null;

        try {
          recorder.stop();
        } catch (cleanupError) {
          console.error(
            "AUDIO CLEANUP ERROR:",
            cleanupError
          );
        }
      }

      stopMediaStream();
      revokePreviewUrl();
    };
  }, [
    clearTimer,
    revokePreviewUrl,
    stopMediaStream,
  ]);

  return (
    <div className="ot-audio-recorder">
      {recordingState ===
        "idle" && (
        <button
          type="button"
          className="ot-audio-record-button"
          onClick={startRecording}
          disabled={disabled}
          aria-label="Record audio message"
        >
          <span className="ot-audio-record-icon">
            🎤
          </span>

          <span>
            Record Audio
          </span>
        </button>
      )}

      {(isRecording ||
        isPaused) && (
        <div className="ot-audio-recording-bar">
          <button
            type="button"
            className="ot-audio-cancel-button"
            onClick={
              cancelRecording
            }
            aria-label="Cancel recording"
          >
            🗑
          </button>

          <div className="ot-audio-recording-status">
            <span
              className={`ot-audio-record-dot ${
                isPaused
                  ? "is-paused"
                  : ""
              }`}
            />

            <strong>
              {isPaused
                ? "Recording paused"
                : "Recording audio"}
            </strong>

            <span className="ot-audio-recording-time">
              {formatDuration(
                seconds
              )}
            </span>
          </div>

          <button
            type="button"
            className="ot-audio-pause-button"
            onClick={
              isPaused
                ? resumeRecording
                : pauseRecording
            }
            aria-label={
              isPaused
                ? "Resume recording"
                : "Pause recording"
            }
          >
            {isPaused
              ? "▶"
              : "Ⅱ"}
          </button>

          <button
            type="button"
            className="ot-audio-stop-button"
            onClick={
              stopRecording
            }
            aria-label="Finish recording"
          >
            ✓
          </button>
        </div>
      )}

      {hasRecording && (
        <div className="ot-audio-ready-card">
          <button
            type="button"
            className="ot-audio-delete-button"
            onClick={
              removeRecording
            }
            disabled={disabled}
            aria-label="Delete recorded audio"
          >
            🗑
          </button>

          <div className="ot-audio-ready-content">
            <div className="ot-audio-ready-heading">
              <span>🎤</span>

              <div>
                <strong>
                  Voice message
                </strong>

                <small>
                  {formatDuration(
                    seconds
                  )}
                </small>
              </div>
            </div>

            <audio
              controls
              preload="metadata"
              src={previewUrl}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="ot-audio-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default OrderTrackingAudioRecorder;