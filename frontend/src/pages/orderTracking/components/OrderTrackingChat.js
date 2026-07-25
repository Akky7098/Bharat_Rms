import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  formatDate,
  getPublicFileUrl,
  getStatusTone,
  humanize,
} from "../orderTrackingUtils";

import OrderTrackingAudioRecorder from "./OrderTrackingAudioRecorder";

const MAX_FILES = 10;

const TRACKING_STAGES = [
  {
    value: "order_approved",
    label: "Approved",
  },
  {
    value: "planning",
    label: "Planning",
  },
  {
    value: "material_pending",
    label: "Material",
  },
  {
    value: "cutting_started",
    label: "Cutting",
  },
  {
    value: "cutting_completed",
    label: "Cutting Done",
  },
  {
    value: "machining_started",
    label: "Machining",
  },
  {
    value: "machining_completed",
    label: "Machining Done",
  },
  {
    value: "ready_for_dispatch",
    label: "Ready",
  },
  {
    value: "loading_started",
    label: "Loading",
  },
  {
    value: "dispatched",
    label: "Dispatched",
  },
  {
    value: "in_transit",
    label: "In Transit",
  },
  {
    value: "reached_destination",
    label: "Reached",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
];

const STATUS_STAGE_MAP = {
  cutting_partial:
    "cutting_started",

  machining_partial:
    "machining_started",

  on_hold:
    "planning",

  cancelled:
    "planning",
};

const getNormalizedTrackingStatus = (
  status = ""
) =>
  STATUS_STAGE_MAP[status] ||
  status ||
  "order_approved";

const getUserId = (user = {}) =>
  user?._id ||
  user?.id ||
  user?.userId ||
  "";

const getInitials = (name = "") => {
  const words = String(name || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "U";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
};

const formatFileSize = (
  bytes = 0
) => {
  const size = Number(bytes || 0);

  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

const getAttachmentIcon = (
  fileType = ""
) => {
  if (fileType === "image") {
    return "🖼";
  }

  if (fileType === "audio") {
    return "🎤";
  }

  if (fileType === "video") {
    return "🎬";
  }

  return "📄";
};

const getReadUsers = (
  message = {},
  senderId = ""
) =>
  Array.isArray(message.readBy)
    ? message.readBy.filter(
        (receipt) =>
          String(receipt.userId || "") !==
          String(senderId || "")
      )
    : [];

const MessageTicks = ({
  message,
  ownMessage,
  onOpenSeenBy,
}) => {
  if (!ownMessage) {
    return null;
  }

  const senderId =
    message.sender?.userId;

  const readUsers =
    getReadUsers(
      message,
      senderId
    );

  const delivered =
    message.delivered !== false;

  const seenByAll =
    Boolean(
      message.isSeenByAll
    );

  const seenBySomeone =
    readUsers.length > 0;

  if (!delivered) {
    return (
      <span
        className="ot-message-ticks pending"
        title="Sending"
      >
        ◷
      </span>
    );
  }

  if (!seenBySomeone) {
    return (
      <span
        className="ot-message-ticks delivered"
        title="Delivered"
      >
        ✓✓
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`ot-message-ticks seen ${
        seenByAll ? "all-seen" : ""
      }`}
      title={
        seenByAll
          ? "Seen by everyone"
          : `Seen by ${readUsers.length}`
      }
      onClick={() =>
        onOpenSeenBy(message)
      }
    >
      ✓✓
    </button>
  );
};

const SeenByPanel = ({
  message,
  onClose,
}) => {
  if (!message) {
    return null;
  }

  const senderId =
    message.sender?.userId;

  const readUsers =
    getReadUsers(
      message,
      senderId
    );

  return (
    <div
      className="ot-seen-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section className="ot-seen-panel">
        <header>
          <div>
            <span>
              MESSAGE INFORMATION
            </span>

            <h3>
              Seen by
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="ot-seen-content">
          {readUsers.length === 0 ? (
            <div className="ot-seen-empty">
              This message has not been
              seen by another participant
              yet.
            </div>
          ) : (
            readUsers.map(
              (receipt, index) => (
                <article
                  key={
                    receipt.userId ||
                    index
                  }
                  className="ot-seen-user"
                >
                  <div className="ot-seen-avatar">
                    {getInitials(
                      receipt.name ||
                        receipt.userName ||
                        "User"
                    )}
                  </div>

                  <div>
                    <strong>
                      {receipt.name ||
                        receipt.userName ||
                        "Order participant"}
                    </strong>

                    <span>
                      {humanize(
                        receipt.role ||
                          "user"
                      )}
                    </span>
                  </div>

                  <time>
                    {formatDate(
                      receipt.readAt,
                      true
                    )}
                  </time>
                </article>
              )
            )
          )}
        </div>

        <footer>
          <span>
            {message.isSeenByAll
              ? "Seen by everyone"
              : `${readUsers.length} participant(s) have seen this message`}
          </span>
        </footer>
      </section>
    </div>
  );
};

const OrderTrackingChat = ({
  tracking,
  messages = [],
  loading = false,
  sending = false,
  deletingMessageId = "",
  currentUser,
  hasMore = false,
  onLoadMore,
  onSend,
  onDeleteMessage,
}) => {
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [text, setText] =
    useState("");

  const [files, setFiles] =
    useState([]);

  const [audio, setAudio] =
    useState(null);

  const [
    audioResetKey,
    setAudioResetKey,
  ] = useState(0);

  const [
    openMessageMenuId,
    setOpenMessageMenuId,
  ] = useState("");

  const [
    seenByMessage,
    setSeenByMessage,
  ] = useState(null);

  const [
    deleteConfirmMessage,
    setDeleteConfirmMessage,
  ] = useState(null);

  const currentUserId =
    getUserId(currentUser);

  const chatClosed =
    tracking?.chatStatus ===
    "closed";

  const normalizedStatus =
  getNormalizedTrackingStatus(
    tracking?.currentStatus
  );

  const currentStageIndex =
  Math.max(
    TRACKING_STAGES.findIndex(
      (stage) =>
        stage.value ===
        normalizedStatus
    ),
    0
  );

  const statusHistory =
  Array.isArray(
    tracking?.statusHistory
  )
    ? tracking.statusHistory
    : [];

  const getStageHistory = (
  stageValue
) => {
  const history = [...statusHistory].reverse();

  return history.find((item) => {
    const normalized =
      getNormalizedTrackingStatus(
        item.status
      );

    return normalized === stageValue;
  });
};

  const sortedMessages =
    useMemo(
      () =>
        [...messages].sort(
          (first, second) =>
            new Date(
              first.createdAt || 0
            ) -
            new Date(
              second.createdAt || 0
            )
        ),
      [messages]
    );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [sortedMessages.length]);

  useEffect(() => {
    const closeMenu = () => {
      setOpenMessageMenuId("");
    };

    document.addEventListener(
      "click",
      closeMenu
    );

    return () => {
      document.removeEventListener(
        "click",
        closeMenu
      );
    };
  }, []);

  const removeSelectedFile = (
    indexToRemove
  ) => {
    setFiles((previous) =>
      previous.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );
  };

  const handleFileSelection = (
    event
  ) => {
    const selectedFiles =
      Array.from(
        event.target.files || []
      );

    setFiles((previous) => {
      const combined = [
        ...previous,
        ...selectedFiles,
      ];

      if (
        combined.length >
        MAX_FILES
      ) {
        alert(
          `Maximum ${MAX_FILES} files are allowed.`
        );
      }

      return combined.slice(
        0,
        MAX_FILES
      );
    });

    event.target.value = "";
  };

 const handleSubmit = async (
  event
) => {
  event?.preventDefault?.();

  if (
    sending ||
    chatClosed
  ) {
    return;
  }

  const allFiles = [
      ...files,
    ];

    const durations = [];

    if (audio?.file) {
      allFiles.push(audio.file);

      durations.push(
        audio.durationSeconds || 0
      );
    }

    const cleanText =
      text.trim();

    if (
      !cleanText &&
      !allFiles.length
    ) {
      return;
    }

    await onSend?.(
      {
        text: cleanText,
        durationSeconds:
          durations,
      },
      allFiles
    );

    setText("");
    setFiles([]);
    setAudio(null);

    setAudioResetKey(
      (previous) => previous + 1
    );

    textareaRef.current?.focus();
  };

  const handleTextKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!sending && !chatClosed) {
  handleSubmit(event);
}
    }
  };

  const requestDeleteMessage = (
    message
  ) => {
    setOpenMessageMenuId("");
    setDeleteConfirmMessage(
      message
    );
  };

  const confirmDeleteMessage =
    async () => {
      if (
        !deleteConfirmMessage?._id
      ) {
        return;
      }

      await onDeleteMessage?.(
        deleteConfirmMessage._id
      );

      setDeleteConfirmMessage(
        null
      );
  };

  return (
    <section className="ot-chat-panel ot-whatsapp-chat">
      <header className="ot-chat-header">
  <div className="ot-chat-title-area">
    <div className="ot-chat-group-avatar">
      {getInitials(
        tracking?.companyName ||
          "OT"
      )}
    </div>

    <div>
      <strong>
        Order Conversation
      </strong>

      <span>
        {tracking?.companyName ||
          "Order Tracking"}
      </span>

      <small>
        {tracking?.trackingNumber ||
          "Tracking"}{" "}
        · SO{" "}
        {tracking?.salesOrderNo ||
          "-"}
      </small>
    </div>
  </div>

  <div className="ot-chat-header-status">
    <span
      className={`ot-status-pill ${getStatusTone(
        tracking?.currentStatus
      )}`}
    >
      {humanize(
        tracking?.currentStatus ||
          "order_approved"
      )}
    </span>

    <span
      className={`ot-chat-state ${
        chatClosed
          ? "closed"
          : "open"
      }`}
    >
      {chatClosed
        ? "Chat Closed"
        : "Chat Active"}
    </span>
  </div>
</header>

      <section className="ot-chat-tracking-header">
        <div className="ot-chat-status-strip">
          <div className="ot-chat-status-main">
            <span className="ot-chat-status-label">
              CURRENT STATUS
            </span>

            <strong>
              {humanize(
                tracking?.currentStatus ||
                  "order_approved"
              )}
            </strong>

            <small>
              {tracking?.latestUpdateText ||
                "No factory update has been added yet."}
            </small>
          </div>

          <div className="ot-chat-operational-summary">
            <div className="ot-chat-summary-item">
              <span>
                Last Updated
              </span>

              <strong>
                {formatDate(
                  tracking?.latestUpdateAt,
                  true
                )}
              </strong>

              <small>
                {tracking?.latestUpdateBy
                  ?.name
                  ? `By ${tracking.latestUpdateBy.name}`
                  : "Update owner not available"}
              </small>
            </div>

            <div className="ot-chat-summary-item">
              <span>
                Assigned Plant
              </span>

              <strong>
                {tracking?.sourcePlant
                  ?.plantName || "-"}
              </strong>

              <small>
                {tracking?.sourcePlant
                  ?.plantCode ||
                  "Plant code not added"}
              </small>
            </div>

            <div className="ot-chat-summary-item">
              <span>
                Transporter
              </span>

              <strong>
                {tracking?.transporter
                  ?.transporterName || "-"}
              </strong>

              <small>
                {tracking?.expectedDispatchDate
                  ? `Expected ${formatDate(
                      tracking.expectedDispatchDate
                    )}`
                  : "Dispatch date not added"}
              </small>
            </div>
          </div>
        </div>

        <div className="ot-chat-timeline-heading">
          <div>
            <span>
              ORDER PROGRESS
            </span>

            <strong>
              Production & Dispatch Timeline
            </strong>
          </div>

          <small>
            {currentStageIndex + 1} of{" "}
            {TRACKING_STAGES.length} stages
          </small>
        </div>

        <div className="ot-chat-timeline-mini">
    {TRACKING_STAGES.map(
      (stage, index) => {
        const stageHistory =
          getStageHistory(
            stage.value
          );

        const completed =
          index <
          currentStageIndex;

        const active =
          index ===
          currentStageIndex;

        const pending =
          index >
          currentStageIndex;

        return (
          <div
            key={stage.value}
            className={`ot-chat-step ${
              completed
                ? "completed"
                : ""
            } ${
              active
                ? "active"
                : ""
            } ${
              pending
                ? "pending"
                : ""
            }`}
          >
            <span className="ot-chat-step-marker">
              {completed
                ? "✓"
                : active
                ? "●"
                : ""}
            </span>

            <div>
              <strong>
                {stage.label}
              </strong>

              {stageHistory
                ?.createdAt && (
                <small>
                  {formatDate(
                    stageHistory.createdAt
                  )}
                </small>
              )}
            </div>
          </div>
        );
      }
    )}
  </div>
</section>

<div className="ot-chat-background">
        <div className="ot-chat-messages">
          {hasMore && (
            <button
              type="button"
              className="ot-load-more"
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : "Load Older Messages"}
            </button>
          )}

          {!loading &&
            sortedMessages.length ===
              0 && (
              <div className="ot-chat-empty">
                <span>💬</span>

                <strong>
                  Start the order
                  conversation
                </strong>

                <p>
                  Factory staff can send
                  text, audio, photos and
                  documents here.
                </p>
              </div>
            )}

          {sortedMessages.map(
            (message) => {
              const senderId =
                message.sender?.userId;

              const ownMessage =
                String(
                  senderId || ""
                ) ===
                String(
                  currentUserId || ""
                );

              const deleted =
                Boolean(
                  message.isDeleted ||
                    message
                      .deletedForEveryone
                );

              const systemMessage =
  Boolean(
    message.isSystemMessage
  ) ||
  [
    "system",
    "status_update",
    "update_request",
  ].includes(
    message.messageType
  );

              if (systemMessage) {
  const isStatusUpdate =
    message.messageType ===
    "status_update";

  const isUpdateRequest =
    message.messageType ===
    "update_request";

  return (
    <div
      key={message._id}
      className={`ot-system-message ${
        isStatusUpdate
          ? "status-update"
          : ""
      } ${
        isUpdateRequest
          ? "update-request"
          : ""
      }`}
    >
      <div className="ot-system-message-icon">
        {isStatusUpdate
          ? "✓"
          : isUpdateRequest
          ? "!"
          : "i"}
      </div>

      <div className="ot-system-message-content">
        <strong>
          {isStatusUpdate
            ? "Order Status Updated"
            : isUpdateRequest
            ? "Update Requested"
            : "Order Information"}
        </strong>

        <span>
          {message.text ||
            "Order information updated."}
        </span>

        <small>
          {message.sender?.name
            ? `${message.sender.name} · `
            : ""}
          {formatDate(
            message.createdAt,
            true
          )}
        </small>
      </div>
    </div>
  );
}

              return (
                <article
                  key={message._id}
                  className={`ot-message ${
                    ownMessage
                      ? "own"
                      : "other"
                  } ${
                    deleted
                      ? "deleted"
                      : ""
                  }`}
                >
                  {!ownMessage && (
                    <div className="ot-message-avatar">
                      {getInitials(
                        message.sender
                          ?.name ||
                          "User"
                      )}
                    </div>
                  )}

                  <div className="ot-message-bubble">
                    <div className="ot-message-topline">
                      {!ownMessage && (
                        <div>
                          <strong>
                            {message.sender
                              ?.name ||
                              "User"}
                          </strong>

                          <span>
                            {humanize(
                              message.sender
                                ?.role ||
                                "user"
                            )}
                          </span>
                        </div>
                      )}

                      {ownMessage &&
                        !deleted && (
                          <div className="ot-message-menu-wrap">
                            <button
                              type="button"
                              className="ot-message-menu-button"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                setOpenMessageMenuId(
                                  (previous) =>
                                    previous ===
                                    message._id
                                      ? ""
                                      : message._id
                                );
                              }}
                              aria-label="Message options"
                            >
                              ⌄
                            </button>

                            {openMessageMenuId ===
                              message._id && (
                              <div
                                className="ot-message-menu"
                                onClick={(
                                  event
                                ) =>
                                  event.stopPropagation()
                                }
                              >
                                <button
  type="button"
  onClick={() => {
    setOpenMessageMenuId(
      ""
    );

    setSeenByMessage(
      message
    );
  }}
>
  Message Information
</button>

                                <button
                                  type="button"
                                  className="delete"
                                  onClick={() =>
                                    requestDeleteMessage(
                                      message
                                    )
                                  }
                                >
                                  Delete for
                                  Everyone
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {deleted ? (
                      <div className="ot-deleted-message">
                        <span>🚫</span>

                        <em>
                          This message was
                          deleted
                        </em>
                      </div>
                    ) : (
                      <>
                        {message.text && (
                          <p className="ot-message-text">
                            {message.text}
                          </p>
                        )}

                        {Array.isArray(
                          message.attachments
                        ) &&
                          message
                            .attachments
                            .length >
                            0 && (
                            <div className="ot-message-files">
                              {message.attachments.map(
                                (
                                  attachment
                                ) => {
                                  const url =
                                    getPublicFileUrl(
                                      attachment.fileUrl
                                    );

                                  if (
                                    attachment.fileType ===
                                    "image"
                                  ) {
                                    return (
                                      <a
                                        key={
                                          attachment._id ||
                                          attachment.fileUrl
                                        }
                                        href={
                                          url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ot-message-image"
                                      >
                                        <img
                                          src={
                                            url
                                          }
                                          alt={
                                            attachment.originalName ||
                                            "Order update"
                                          }
                                        />

                                        <span>
                                          Open
                                          image
                                        </span>
                                      </a>
                                    );
                                  }

                                  if (
                                    attachment.fileType ===
                                    "audio"
                                  ) {
                                    return (
                                      <div
                                        key={
                                          attachment._id ||
                                          attachment.fileUrl
                                        }
                                        className="ot-message-audio"
                                      >
                                        <div className="ot-audio-message-icon">
                                          🎤
                                        </div>

                                        <div>
                                          <span>
                                            Voice
                                            message
                                          </span>

                                          <audio
                                            controls
                                            preload="metadata"
                                            src={
                                              url
                                            }
                                          />
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (
                                    attachment.fileType ===
                                    "video"
                                  ) {
                                    return (
                                      <video
                                        key={
                                          attachment._id ||
                                          attachment.fileUrl
                                        }
                                        controls
                                        preload="metadata"
                                        className="ot-message-video"
                                        src={
                                          url
                                        }
                                      />
                                    );
                                  }

                                  return (
                                    <a
                                      key={
                                        attachment._id ||
                                        attachment.fileUrl
                                      }
                                      className="ot-message-document"
                                      href={
                                        url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <span className="ot-document-icon">
                                        {getAttachmentIcon(
                                          attachment.fileType
                                        )}
                                      </span>

                                      <div>
                                        <strong>
                                          {attachment.originalName ||
                                            attachment.fileName ||
                                            "Open File"}
                                        </strong>

                                        <small>
                                          {formatFileSize(
                                            attachment.fileSize
                                          ) ||
                                            "Open attachment"}
                                        </small>
                                      </div>
                                    </a>
                                  );
                                }
                              )}
                            </div>
                          )}
                      </>
                    )}

                    <div className="ot-message-footer">
                      <time>
                        {formatDate(
                          message.createdAt,
                          true
                        )}
                      </time>

                      <MessageTicks
                        message={
                          message
                        }
                        ownMessage={
                          ownMessage
                        }
                        onOpenSeenBy={
                          setSeenByMessage
                        }
                      />
                    </div>
                  </div>
                </article>
              );
            }
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {chatClosed ? (
        <div className="ot-chat-closed">
          <span>🔒</span>

          This conversation is closed
          because the order has been
          completed.
        </div>
      ) : (
        <form
          className="ot-chat-composer"
          onSubmit={handleSubmit}
        >
          {files.length > 0 && (
            <div className="ot-chat-file-preview">
              {files.map(
                (file, index) => (
                  <article
                    key={`${file.name}-${index}`}
                  >
                    <span>
                      {file.type.startsWith(
                        "image/"
                      )
                        ? "🖼"
                        : file.type.startsWith(
                            "audio/"
                          )
                        ? "🎤"
                        : file.type.startsWith(
                            "video/"
                          )
                        ? "🎬"
                        : "📄"}
                    </span>

                    <div>
                      <strong>
                        {file.name}
                      </strong>

                      <small>
                        {formatFileSize(
                          file.size
                        )}
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedFile(
                          index
                        )
                      }
                    >
                      ×
                    </button>
                  </article>
                )
              )}
            </div>
          )}

          <div className="ot-chat-audio-area">
            <OrderTrackingAudioRecorder
              disabled={
                sending ||
                chatClosed
              }
              resetKey={audioResetKey}
              onChange={setAudio}
            />
          </div>

          <div className="ot-chat-compose-row">
            <label className="ot-chat-attach-button">
              📎

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,audio/*,video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={
                  handleFileSelection
                }
                disabled={
                  sending ||
                  chatClosed
                }
              />
            </label>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value
                )
              }
              onKeyDown={
                handleTextKeyDown
              }
              placeholder="Type a message"
              rows={1}
              disabled={
                sending ||
                chatClosed
              }
            />

            <button
              type="submit"
              className="ot-chat-send-button"
              disabled={
                sending ||
                chatClosed ||
                (!text.trim() &&
                  !files.length &&
                  !audio?.file)
              }
            >
              {sending ? "…" : "➤"}
            </button>
          </div>

          <small className="ot-chat-compose-help">
            Enter to send · Shift +
            Enter for a new line
          </small>
        </form>
      )}

      <SeenByPanel
        message={seenByMessage}
        onClose={() =>
          setSeenByMessage(null)
        }
      />

      {deleteConfirmMessage && (
        <div className="ot-delete-message-overlay">
          <section className="ot-delete-message-dialog">
            <div className="ot-delete-message-icon">
              🗑
            </div>

            <h3>
              Delete message?
            </h3>

            <p>
              This message will be
              removed for everyone in
              this order conversation.
            </p>

            <div>
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirmMessage(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete"
                onClick={
                  confirmDeleteMessage
                }
                disabled={
                  deletingMessageId ===
                  deleteConfirmMessage._id
                }
              >
                {deletingMessageId ===
                deleteConfirmMessage._id
                  ? "Deleting..."
                  : "Delete for Everyone"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default OrderTrackingChat;