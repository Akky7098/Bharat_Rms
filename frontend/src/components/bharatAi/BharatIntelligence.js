import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  askBharatIntelligence,
  getBharatAiUser,
} from "../../services/bharatAiService";

import "./BharatIntelligence.css";

/* =========================================================
   CONFIG
========================================================= */

const STORAGE_KEYS = {
  conversationId:
    "bharat_ai_conversation_id",

  messages:
    "bharat_ai_messages",
};

const MAX_LOCAL_MESSAGES =
  40;

const MAX_INLINE_FILE_SIZE =
  1024 * 1024;

const INLINE_FILE_TYPES = [
  "text/plain",
  "text/csv",
  "application/json",
  "text/markdown",
];

const INLINE_FILE_EXTENSIONS = [
  ".txt",
  ".csv",
  ".json",
  ".md",
];

/* =========================================================
   INLINE ICONS
========================================================= */

const Icon = ({
  name,
  size = 20,
}) => {
  const common = {
    width: size,
    height: size,
    viewBox:
      "0 0 24 24",
    fill: "none",
    stroke:
      "currentColor",
    strokeWidth:
      1.9,
    strokeLinecap:
      "round",
    strokeLinejoin:
      "round",
    "aria-hidden":
      true,
  };

  switch (name) {
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3l1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" />
          <path d="M18.5 13.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
          <path d="M5.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
        </svg>
      );

    case "send":
      return (
        <svg {...common}>
          <path d="M22 2 11 13" />
          <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "copy":
      return (
        <svg {...common}>
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2"
          />

          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6 18 20H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="4"
          />

          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case "mic":
      return (
        <svg {...common}>
          <rect
            x="9"
            y="2"
            width="6"
            height="12"
            rx="3"
          />

          <path d="M5 10a7 7 0 0 0 14 0" />
          <path d="M12 17v5" />
          <path d="M8 22h8" />
        </svg>
      );

    case "stop":
      return (
        <svg {...common}>
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            rx="2"
          />
        </svg>
      );

    case "paperclip":
      return (
        <svg {...common}>
          <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7L9.7 17.7a2 2 0 0 1-2.8-2.8l8.9-8.9" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
        </svg>
      );

    case "external":
      return (
        <svg {...common}>
          <path d="M15 3h6v6" />
          <path d="m10 14 11-11" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      );

    case "brain":
      return (
        <svg {...common}>
          <path d="M9.5 4A2.5 2.5 0 0 0 5 5.5c0 .4.1.8.3 1.2A3 3 0 0 0 4 12a3 3 0 0 0 1.5 5.5A2.5 2.5 0 0 0 10 19" />
          <path d="M14.5 4A2.5 2.5 0 0 1 19 5.5c0 .4-.1.8-.3 1.2A3 3 0 0 1 20 12a3 3 0 0 1-1.5 5.5A2.5 2.5 0 0 1 14 19" />
          <path d="M10 4v16" />
          <path d="M14 4v16" />
        </svg>
      );

    case "globe":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18" />
          <path d="M12 3a15 15 0 0 0 0 18" />
        </svg>
      );

    default:
      return null;
  }
};

/* =========================================================
   HELPERS
========================================================= */

const createId = () =>
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const formatTime = (
  dateValue
) => {
  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        dateValue
      )
    );
  } catch {
    return "";
  }
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes || 0);

  if (
    size <
    1024
  ) {
    return `${size} B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(1)} MB`;
};

const getGreeting =
  () => {
    const hour =
      new Date()
        .getHours();

    if (
      hour <
      12
    ) {
      return "Good morning";
    }

    if (
      hour <
      17
    ) {
      return "Good afternoon";
    }

    return "Good evening";
  };

const getFirstName = (
  user
) => {
  const name =
    String(
      user?.name ||
        ""
    ).trim();

  if (!name) {
    return "";
  }

  return name.split(
    /\s+/
  )[0];
};

const getFileExtension = (
  filename
) => {
  const lower =
    String(
      filename ||
        ""
    ).toLowerCase();

  const index =
    lower.lastIndexOf(
      "."
    );

  if (
    index ===
    -1
  ) {
    return "";
  }

  return lower.slice(
    index
  );
};

const isInlineReadableFile = (
  file
) => {
  return (
    INLINE_FILE_TYPES.includes(
      file?.type
    ) ||
    INLINE_FILE_EXTENSIONS.includes(
      getFileExtension(
        file?.name
      )
    )
  );
};

const readTextFile = (
  file
) => {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          resolve(
            String(
              reader.result ||
                ""
            )
          );
        };

      reader.onerror =
        () => {
          reject(
            new Error(
              `Unable to read ${file.name}.`
            )
          );
        };

      reader.readAsText(
        file
      );
    }
  );
};

/* =========================================================
   RESPONSE FORMATTER
========================================================= */

const ResponseContent = ({
  text,
}) => {
  if (!text) {
    return null;
  }

  const lines =
    String(text).split(
      "\n"
    );

  const elements =
    [];

  let bulletBuffer =
    [];

  const flushBullets =
    () => {
      if (
        bulletBuffer.length ===
        0
      ) {
        return;
      }

      const current =
        [
          ...bulletBuffer,
        ];

      bulletBuffer =
        [];

      elements.push(
        <ul
          className="bharat-ai-response-list"
          key={`list-${elements.length}`}
        >
          {current.map(
            (
              item,
              index
            ) => (
              <li
                key={`${item}-${index}`}
              >
                {item}
              </li>
            )
          )}
        </ul>
      );
    };

  lines.forEach(
    (
      rawLine,
      index
    ) => {
      const line =
        rawLine.trim();

      if (!line) {
        flushBullets();

        return;
      }

      const bullet =
        line.match(
          /^[-•*]\s+(.*)$/
        );

      if (bullet) {
        bulletBuffer.push(
          bullet[1]
        );

        return;
      }

      flushBullets();

      const section =
        line.match(
          /^(FACT|ANALYSIS|RECOMMENDATION|ACTION)\s*:?\s*(.*)$/i
        );

      if (section) {
        elements.push(
          <div
            className="bharat-ai-response-section-title"
            key={`section-${index}`}
          >
            <span>
              {
                section[1]
              }
            </span>

            {section[2] && (
              <p>
                {
                  section[2]
                }
              </p>
            )}
          </div>
        );

        return;
      }

      const heading =
        line.match(
          /^#{1,3}\s+(.*)$/
        );

      if (heading) {
        elements.push(
          <h4
            key={`heading-${index}`}
          >
            {
              heading[1]
            }
          </h4>
        );

        return;
      }

      elements.push(
        <p
          key={`paragraph-${index}`}
        >
          {line}
        </p>
      );
    }
  );

  flushBullets();

  return (
    <div className="bharat-ai-response-content">
      {elements}
    </div>
  );
};

/* =========================================================
   DOCUMENT / SOURCE CARDS
========================================================= */

const DocumentCards = ({
  documents,
}) => {
  if (
    !Array.isArray(
      documents
    ) ||
    documents.length ===
      0
  ) {
    return null;
  }

  return (
    <div className="bharat-ai-reference-section">
      <div className="bharat-ai-reference-label">
        <Icon
          name="file"
          size={13}
        />

        Bharat documents
      </div>

      <div className="bharat-ai-reference-list">
        {documents.map(
          (
            document,
            index
          ) => (
            <a
              key={
                document.id ||
                document._id ||
                `${document.title}-${index}`
              }
              href={
                document.fileUrl ||
                "#"
              }
              target="_blank"
              rel="noreferrer"
              className="bharat-ai-reference-card"
            >
              <span className="bharat-ai-reference-icon">
                <Icon
                  name="file"
                  size={16}
                />
              </span>

              <span className="bharat-ai-reference-copy">
                <strong>
                  {document.title ||
                    document.originalFileName ||
                    "Bharat document"}
                </strong>

                <small>
                  {document.originalFileName ||
                    document.mimeType ||
                    "Document"}
                </small>
              </span>

              <Icon
                name="external"
                size={14}
              />
            </a>
          )
        )}
      </div>
    </div>
  );
};

const SourceCards = ({
  sources,
}) => {
  if (
    !Array.isArray(
      sources
    ) ||
    sources.length ===
      0
  ) {
    return null;
  }

  return (
    <div className="bharat-ai-reference-section">
      <div className="bharat-ai-reference-label">
        <Icon
          name="globe"
          size={13}
        />

        Sources
      </div>

      <div className="bharat-ai-source-pills">
        {sources.map(
          (
            source,
            index
          ) => (
            <a
              key={
                source.url ||
                `${source.title}-${index}`
              }
              href={
                source.url
              }
              target="_blank"
              rel="noreferrer"
            >
              <span>
                {source.title ||
                  `Source ${index + 1}`}
              </span>

              <Icon
                name="external"
                size={11}
              />
            </a>
          )
        )}
      </div>
    </div>
  );
};

/* =========================================================
   THINKING STATE
========================================================= */

const ThinkingState = ({
  stage,
}) => {
  const stages = {
    understanding:
      "Understanding your question",

    data:
      "Connecting the right knowledge",

    analysis:
      "Preparing a useful answer",
  };

  return (
    <div className="bharat-ai-thinking bharat-ai-thinking-premium">
      <div className="bharat-ai-thinking-orb">
        <div />
        <div />
        <div />
      </div>

      <div className="bharat-ai-thinking-copy">
        <strong>
          Bharat Intelligence
        </strong>

        <span>
          {stages[stage] ||
            stages.understanding}
        </span>
      </div>

      <div className="bharat-ai-thinking-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

/* =========================================================
   MESSAGE
========================================================= */

const Message = ({
  message,
  onSuggestionClick,
}) => {
  const [
    copied,
    setCopied,
  ] = useState(
    false
  );

  const copyMessage =
    async () => {
      try {
        await navigator.clipboard.writeText(
          message.content
        );

        setCopied(
          true
        );

        window.setTimeout(
          () =>
            setCopied(
              false
            ),
          1200
        );
      } catch {
        // Ignore clipboard errors.
      }
    };

  if (
    message.role ===
    "user"
  ) {
    return (
      <div className="bharat-ai-message bharat-ai-message-user">
        {Array.isArray(
          message.attachments
        ) &&
          message.attachments.length >
            0 && (
            <div className="bharat-ai-user-file-list">
              {message.attachments.map(
                (
                  file
                ) => (
                  <div
                    className="bharat-ai-user-file"
                    key={
                      file.id ||
                      file.name
                    }
                  >
                    <Icon
                      name="file"
                      size={14}
                    />

                    <span>
                      {file.name}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

        <div className="bharat-ai-user-bubble">
          {
            message.content
          }
        </div>

        <span className="bharat-ai-message-time">
          {formatTime(
            message.createdAt
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="bharat-ai-message bharat-ai-message-assistant">
      <div className="bharat-ai-assistant-row">
        <div className="bharat-ai-assistant-avatar">
          <Icon
            name="sparkles"
            size={17}
          />
        </div>

        <div className="bharat-ai-assistant-main">
          <div className="bharat-ai-assistant-name">
            Bharat Intelligence
          </div>

          <ResponseContent
            text={
              message.content
            }
          />

          <DocumentCards
            documents={
              message.documents
            }
          />

          <SourceCards
            sources={
              message.sources
            }
          />

          <div className="bharat-ai-answer-footer">
            <span>
              {formatTime(
                message.createdAt
              )}
            </span>

            <button
              type="button"
              onClick={
                copyMessage
              }
              title="Copy response"
            >
              <Icon
                name={
                  copied
                    ? "check"
                    : "copy"
                }
                size={14}
              />

              {copied
                ? "Copied"
                : "Copy"}
            </button>
          </div>

          {Array.isArray(
            message.suggestions
          ) &&
            message
              .suggestions
              .length >
              0 && (
              <div className="bharat-ai-inline-suggestions bharat-ai-inline-suggestions-modern">
                {message.suggestions.map(
                  (
                    suggestion
                  ) => (
                    <button
                      key={
                        suggestion
                      }
                      type="button"
                      onClick={() =>
                        onSuggestionClick(
                          suggestion
                        )
                      }
                    >
                      <span>
                        {
                          suggestion
                        }
                      </span>

                      <Icon
                        name="chevron"
                        size={14}
                      />
                    </button>
                  )
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   WELCOME
========================================================= */

const Welcome = ({
  currentUser,
  isUserLoading,
  onSuggestionClick,
}) => {
  const firstName =
    getFirstName(
      currentUser
    );

  const suggestions = [
    {
      eyebrow:
        "Business",

      title:
        "What needs attention today?",

      prompt:
        "What needs attention today?",
    },

    {
      eyebrow:
        "Sales",

      title:
        "Analyze my sales this month",

      prompt:
        "Analyze my sales this month and tell me what needs improvement.",
    },

    {
      eyebrow:
        "Steel knowledge",

      title:
        "Why is DB6 ESR expensive?",

      prompt:
        "Why is DB6 ESR expensive? Explain it practically for a salesperson.",
    },

    {
      eyebrow:
        "Technical",

      title:
        "Explain DB6 chemistry",

      prompt:
        "Explain DB6 chemical composition and the role of each alloying element.",
    },

    {
      eyebrow:
        "Operations",

      title:
        "Which orders are delayed?",

      prompt:
        "Which orders are currently delayed and which need priority attention?",
    },

    {
      eyebrow:
        "Payments",

      title:
        "Show overdue payments",

      prompt:
        "Show overdue payments and tell me which need priority follow-up.",
    },
  ];

  return (
    <div className="bharat-ai-welcome bharat-ai-welcome-next">
      <div className="bharat-ai-welcome-hero">
        <div className="bharat-ai-welcome-orb">
          <Icon
            name="sparkles"
            size={25}
          />

          <span />
        </div>

        <div className="bharat-ai-welcome-greeting">
          {isUserLoading ? (
            <>
              <div className="bharat-ai-name-skeleton bharat-ai-name-skeleton-large" />
              <div className="bharat-ai-name-skeleton bharat-ai-name-skeleton-small" />
            </>
          ) : (
            <>
              <span className="bharat-ai-greeting-label">
                {getGreeting()}
              </span>

              <h2>
                {firstName
                  ? `${firstName}, how can I help?`
                  : "How can I help?"}
              </h2>
            </>
          )}
        </div>
      </div>

      <p className="bharat-ai-welcome-subtitle bharat-ai-welcome-subtitle-next">
        Ask about your business,
        customers, steel,
        metallurgy, calculations,
        Bharat documents or
        anything you need help
        understanding.
      </p>

      <div className="bharat-ai-capability-row">
        <span>
          <Icon
            name="brain"
            size={12}
          />
          Business + Knowledge
        </span>

        <span>
          <Icon
            name="mic"
            size={12}
          />
          Speak naturally
        </span>

        <span>
          <Icon
            name="file"
            size={12}
          />
          Documents
        </span>
      </div>

      <div className="bharat-ai-starter-grid bharat-ai-starter-grid-next">
        {suggestions.map(
          (
            item
          ) => (
            <button
              type="button"
              key={
                item.title
              }
              onClick={() =>
                onSuggestionClick(
                  item.prompt
                )
              }
            >
              <span className="bharat-ai-starter-eyebrow">
                {
                  item.eyebrow
                }
              </span>

              <strong>
                {
                  item.title
                }
              </strong>

              <span className="bharat-ai-starter-arrow">
                <Icon
                  name="chevron"
                  size={15}
                />
              </span>
            </button>
          )
        )}
      </div>

      <div className="bharat-ai-welcome-tip bharat-ai-welcome-tip-next">
        <Icon
          name="sparkles"
          size={13}
        />

        <span>
          English, Hindi or
          Hinglish — ask naturally.
        </span>
      </div>
    </div>
  );
};

/* =========================================================
   ATTACHMENT CHIP
========================================================= */

const AttachmentChip = ({
  attachment,
  onRemove,
}) => {
  return (
    <div className="bharat-ai-attachment-chip">
      <span className="bharat-ai-attachment-icon">
        <Icon
          name="file"
          size={14}
        />
      </span>

      <span className="bharat-ai-attachment-copy">
        <strong>
          {
            attachment.name
          }
        </strong>

        <small>
          {formatFileSize(
            attachment.size
          )}
        </small>
      </span>

      <button
        type="button"
        onClick={() =>
          onRemove(
            attachment.id
          )
        }
        title="Remove file"
      >
        <Icon
          name="close"
          size={13}
        />
      </button>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const BharatIntelligence =
  () => {
    const [
      isOpen,
      setIsOpen,
    ] = useState(
      false
    );

    const [
      currentUser,
      setCurrentUser,
    ] = useState(
      null
    );

    const [
      isUserLoading,
      setIsUserLoading,
    ] = useState(
      true
    );

    const [
      messages,
      setMessages,
    ] = useState([]);

    const [
      conversationId,
      setConversationId,
    ] = useState(
      null
    );

    const [
      input,
      setInput,
    ] = useState("");

    const [
      attachments,
      setAttachments,
    ] = useState([]);

    const [
      isLoading,
      setIsLoading,
    ] = useState(
      false
    );

    const [
      thinkingStage,
      setThinkingStage,
    ] = useState(
      "understanding"
    );

    const [
      error,
      setError,
    ] = useState("");

    const [
      isListening,
      setIsListening,
    ] = useState(
      false
    );

    const [
      speechSupported,
      setSpeechSupported,
    ] = useState(
      false
    );

    
    const textAreaRef =
  useRef(null);

const messagesEndRef =
  useRef(null);

const requestAbortRef =
  useRef(false);

const recognitionRef =
  useRef(null);

/* =====================================================
   SPEECH INPUT REFS
===================================================== */

const speechBaseInputRef =
  useRef("");

const finalSpeechTranscriptRef =
  useRef("");

const fileInputRef =
  useRef(null);

    /* =====================================================
       SPEECH SUPPORT
    ===================================================== */

   useEffect(() => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  setSpeechSupported(
    Boolean(
      SpeechRecognition
    )
  );

  if (
    !SpeechRecognition
  ) {
    return undefined;
  }

  const recognition =
    new SpeechRecognition();

  recognition.lang =
    "en-IN";

  /*
   * Keep continuous speech so the user can speak
   * a full natural question.
   */
  recognition.continuous =
    true;

  /*
   * We can show live words without permanently
   * appending every interim result.
   */
  recognition.interimResults =
    true;

  recognition.maxAlternatives =
    1;

  recognition.onstart =
    () => {
      /*
       * Capture whatever the user typed BEFORE
       * starting the microphone.
       */

      speechBaseInputRef.current =
        String(
          textAreaRef
            .current
            ?.value ||
            ""
        ).trim();

      finalSpeechTranscriptRef.current =
        "";

      setIsListening(
        true
      );

      setError("");
    };

  recognition.onresult =
    (
      event
    ) => {
      let interimTranscript =
        "";

      let newFinalTranscript =
        "";

      for (
        let index =
          event.resultIndex;
        index <
          event.results.length;
        index += 1
      ) {
        const result =
          event.results[
            index
          ];

        const transcript =
          String(
            result?.[0]
              ?.transcript ||
              ""
          ).trim();

        if (
          !transcript
        ) {
          continue;
        }

        if (
          result.isFinal
        ) {
          newFinalTranscript +=
            `${newFinalTranscript ? " " : ""}${transcript}`;
        } else {
          interimTranscript +=
            `${interimTranscript ? " " : ""}${transcript}`;
        }
      }

      /*
       * Only permanent FINAL results are appended
       * to finalSpeechTranscriptRef.
       */

      if (
        newFinalTranscript
      ) {
        const existingFinal =
          String(
            finalSpeechTranscriptRef
              .current ||
              ""
          ).trim();

        /*
         * Avoid browser occasionally returning the
         * same final phrase twice.
         */

        if (
          !existingFinal
            .toLowerCase()
            .endsWith(
              newFinalTranscript
                .toLowerCase()
            )
        ) {
          finalSpeechTranscriptRef.current =
            [
              existingFinal,
              newFinalTranscript,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .trim();
        }
      }

      /*
       * Build the textarea from:
       *
       * original typed text
       * +
       * final recognized speech
       * +
       * current temporary/interim speech
       *
       * We REPLACE the textarea each event.
       * We do NOT append the entire transcript repeatedly.
       */

      const combined =
        [
          speechBaseInputRef
            .current,

          finalSpeechTranscriptRef
            .current,

          interimTranscript,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      setInput(
        combined
      );
    };

  recognition.onerror =
    (
      event
    ) => {
      setIsListening(
        false
      );

      if (
        event?.error ===
        "not-allowed"
      ) {
        setError(
          "Microphone permission is blocked. Please allow microphone access in your browser."
        );

        return;
      }

      if (
        event?.error ===
        "no-speech"
      ) {
        return;
      }

      console.log(
        "BHARAT AI SPEECH ERROR =>",
        event?.error
      );
    };

  recognition.onend =
    () => {
      /*
       * Remove any last interim value and leave
       * only finalized speech in the textarea.
       */

      const combined =
        [
          speechBaseInputRef
            .current,

          finalSpeechTranscriptRef
            .current,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      if (
        combined
      ) {
        setInput(
          combined
        );
      }

      setIsListening(
        false
      );
    };

  recognitionRef.current =
    recognition;

  return () => {
    try {
      recognition.stop();
    } catch {
      // Ignore browser stop errors.
    }

    recognitionRef.current =
      null;
  };
}, []);

    const toggleVoice =
  () => {
    const recognition =
      recognitionRef.current;

    if (
      !recognition
    ) {
      setError(
        "Voice input is not supported by this browser."
      );

      return;
    }

    try {
      if (
        isListening
      ) {
        recognition.stop();

        return;
      }

      /*
       * Capture the CURRENT typed input only once.
       */

      speechBaseInputRef.current =
        String(
          input ||
            ""
        ).trim();

      finalSpeechTranscriptRef.current =
        "";

      recognition.start();
    } catch (
      error
    ) {
      /*
       * Chrome throws InvalidStateError when start()
       * is clicked twice very quickly.
       */

      if (
        error?.name !==
        "InvalidStateError"
      ) {
        console.log(
          "BHARAT AI MICROPHONE ERROR =>",
          error
        );
      }
    }
  };

    /* =====================================================
       LOAD CURRENT USER
    ===================================================== */

    useEffect(() => {
      let mounted =
        true;

      const loadUser =
        async () => {
          try {
            const response =
              await getBharatAiUser();

            if (!mounted) {
              return;
            }

            const user =
              response
                ?.data
                ?.user ||
              response
                ?.user ||
              null;

            setCurrentUser(
              user
            );
          } catch (
            requestError
          ) {
            console.error(
              "Unable to load Bharat Intelligence user:",
              requestError
            );
          } finally {
            if (
              mounted
            ) {
              setIsUserLoading(
                false
              );
            }
          }
        };

      loadUser();

      return () => {
        mounted =
          false;
      };
    }, []);

    /* =====================================================
       RESTORE CHAT
    ===================================================== */

    useEffect(() => {
      try {
        const storedMessages =
          JSON.parse(
            localStorage.getItem(
              STORAGE_KEYS.messages
            ) ||
              "[]"
          );

        if (
          Array.isArray(
            storedMessages
          )
        ) {
          setMessages(
            storedMessages
          );
        }

        const storedConversation =
          localStorage.getItem(
            STORAGE_KEYS.conversationId
          );

        if (
          storedConversation
        ) {
          setConversationId(
            storedConversation
          );
        }
      } catch {
        localStorage.removeItem(
          STORAGE_KEYS.messages
        );
      }
    }, []);

    /* =====================================================
       STORE CHAT
    ===================================================== */

    useEffect(() => {
      try {
        localStorage.setItem(
          STORAGE_KEYS.messages,

          JSON.stringify(
            messages.slice(
              -MAX_LOCAL_MESSAGES
            )
          )
        );
      } catch {
        // Ignore storage quota errors.
      }
    }, [messages]);

    useEffect(() => {
      if (
        conversationId
      ) {
        localStorage.setItem(
          STORAGE_KEYS.conversationId,
          conversationId
        );
      } else {
        localStorage.removeItem(
          STORAGE_KEYS.conversationId
        );
      }
    }, [conversationId]);

    /* =====================================================
       AUTO SCROLL
    ===================================================== */

    useEffect(() => {
      messagesEndRef.current
        ?.scrollIntoView({
          behavior:
            "smooth",

          block:
            "end",
        });
    }, [
      messages,
      isLoading,
      thinkingStage,
    ]);

    /* =====================================================
       ESC CLOSE
    ===================================================== */

    useEffect(() => {
      const onKeyDown =
        (
          event
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setIsOpen(
              false
            );
          }
        };

      window.addEventListener(
        "keydown",
        onKeyDown
      );

      return () =>
        window.removeEventListener(
          "keydown",
          onKeyDown
        );
    }, []);

    /* =====================================================
       BODY CLASS
    ===================================================== */

    useEffect(() => {
      if (
        isOpen
      ) {
        document.body.classList.add(
          "bharat-ai-open"
        );
      } else {
        document.body.classList.remove(
          "bharat-ai-open"
        );
      }

      return () =>
        document.body.classList.remove(
          "bharat-ai-open"
        );
    }, [isOpen]);

    /* =====================================================
       AUTO RESIZE
    ===================================================== */

    useEffect(() => {
      const textarea =
        textAreaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height =
        "auto";

      textarea.style.height =
        `${Math.min(
          textarea.scrollHeight,
          160
        )}px`;
    }, [input]);

    /* =====================================================
       THINKING PROGRESSION
    ===================================================== */

    useEffect(() => {
      if (
        !isLoading
      ) {
        return undefined;
      }

      setThinkingStage(
        "understanding"
      );

      const dataTimer =
        window.setTimeout(
          () => {
            setThinkingStage(
              "data"
            );
          },
          700
        );

      const analysisTimer =
        window.setTimeout(
          () => {
            setThinkingStage(
              "analysis"
            );
          },
          1800
        );

      return () => {
        window.clearTimeout(
          dataTimer
        );

        window.clearTimeout(
          analysisTimer
        );
      };
    }, [isLoading]);

    const hasMessages =
      messages.length >
      0;

    /* =====================================================
       FILE PICKER
    ===================================================== */

    const handleFileChange =
      async (
        event
      ) => {
        const selectedFiles =
          Array.from(
            event.target.files ||
              []
          );

        event.target.value =
          "";

        if (
          selectedFiles.length ===
          0
        ) {
          return;
        }

        const prepared =
          [];

        for (
          const file of
          selectedFiles.slice(
            0,
            5
          )
        ) {
          const attachment = {
            id:
              createId(),

            name:
              file.name,

            size:
              file.size,

            type:
              file.type,

            file,

            inlineContent:
              null,

            backendRequired:
              false,
          };

          if (
            isInlineReadableFile(
              file
            )
          ) {
            if (
              file.size >
              MAX_INLINE_FILE_SIZE
            ) {
              attachment.backendRequired =
                true;
            } else {
              try {
                attachment.inlineContent =
                  await readTextFile(
                    file
                  );
              } catch {
                attachment.backendRequired =
                  true;
              }
            }
          } else {
            /*
             * PDF / Word / images require the
             * upcoming multipart backend endpoint.
             */

            attachment.backendRequired =
              true;
          }

          prepared.push(
            attachment
          );
        }

        setAttachments(
          (
            current
          ) => [
            ...current,
            ...prepared,
          ].slice(
            0,
            5
          )
        );
      };

    const removeAttachment =
      (
        attachmentId
      ) => {
        setAttachments(
          (
            current
          ) =>
            current.filter(
              (
                item
              ) =>
                item.id !==
                attachmentId
            )
        );
      };

    /* =====================================================
       BUILD MESSAGE WITH INLINE TEXT FILES
    ===================================================== */

    const buildOutgoingMessage =
  useCallback(
    (
      message
    ) => {
      const readable =
        attachments.filter(
          (
            attachment
          ) =>
            Boolean(
              attachment.inlineContent
            )
        );

      if (
        readable.length ===
        0
      ) {
        return message;
      }

      const fileContext =
        readable
          .map(
            (
              attachment
            ) => {
              return [
                `ATTACHED FILE: ${attachment.name}`,
                "```",
                attachment.inlineContent.slice(
                  0,
                  30000
                ),
                "```",
              ].join(
                "\n"
              );
            }
          )
          .join(
            "\n\n"
          );

      return `${message}\n\n${fileContext}`;
    },
    [
      attachments,
    ]
  );

    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    const sendMessage =
      useCallback(
        async (
          rawMessage
        ) => {
          const message =
            String(
              rawMessage ??
                input
            ).trim();

          if (
            !message ||
            isLoading
          ) {
            return;
          }

          const unsupportedFiles =
            attachments.filter(
              (
                attachment
              ) =>
                attachment.backendRequired
            );

          if (
            unsupportedFiles.length >
            0
          ) {
            setError(
              "PDF, image and Word-file analysis needs the chat upload backend connection. Text, CSV, JSON and Markdown files can be used now."
            );

            return;
          }

          if (
            isListening
          ) {
            try {
              recognitionRef.current
                ?.stop();
            } catch {
              // Ignore.
            }
          }

          const visibleAttachments =
            attachments.map(
              (
                attachment
              ) => ({
                id:
                  attachment.id,

                name:
                  attachment.name,

                size:
                  attachment.size,

                type:
                  attachment.type,
              })
            );

          const userMessage = {
            id:
              createId(),

            role:
              "user",

            content:
              message,

            attachments:
              visibleAttachments,

            createdAt:
              new Date().toISOString(),
          };

          const outgoingMessage =
            buildOutgoingMessage(
              message
            );

          setMessages(
            (
              current
            ) => [
              ...current,
              userMessage,
            ]
          );

          setInput("");
          setAttachments([]);
          setError("");
          setIsLoading(
            true
          );

          requestAbortRef.current =
            false;

          try {
            const response =
              await askBharatIntelligence(
                {
                  message:
                    outgoingMessage,

                  conversationId,
                }
              );

            if (
              requestAbortRef.current
            ) {
              return;
            }

            const result =
              response
                ?.data;

            if (
              !response
                ?.success ||
              !result
                ?.answer
            ) {
              throw new Error(
                response
                  ?.message ||
                  "I couldn't complete that request."
              );
            }

            if (
              result
                ?.conversationId
            ) {
              setConversationId(
                result.conversationId
              );
            }

            const assistantMessage = {
              id:
                createId(),

              role:
                "assistant",

              content:
                result.answer,

              requestType:
                result.requestType,

              route:
                result.route,

              /*
               * IMPORTANT:
               * Use BACKEND contextual suggestions now.
               * Do not use old frontend keyword suggestions.
               */

              suggestions:
                Array.isArray(
                  result.suggestions
                )
                  ? result.suggestions
                  : [],

              documents:
                Array.isArray(
                  result.documents
                )
                  ? result.documents
                  : [],

              sources:
                Array.isArray(
                  result.sources
                )
                  ? result.sources
                  : [],

              createdAt:
                result.generatedAt ||
                new Date().toISOString(),
            };

            setMessages(
              (
                current
              ) => [
                ...current,
                assistantMessage,
              ]
            );
          } catch (
            requestError
          ) {
            console.error(
              "Bharat Intelligence error:",
              requestError
            );

            const status =
              requestError
                ?.response
                ?.status;

            let messageText =
              requestError
                ?.response
                ?.data
                ?.message ||
              requestError
                ?.message ||
              "Bharat Intelligence is temporarily unavailable.";

            if (
              status ===
                401 ||
              status ===
                403
            ) {
              messageText =
                "Your session could not be verified. Please sign in again.";
            }

            setError(
              messageText
            );
          } finally {
            setIsLoading(
              false
            );
          }
        },
        [
  input,
  isLoading,
  conversationId,
  attachments,
  isListening,
  buildOutgoingMessage,
]
      );

    /* =====================================================
       ENTER KEY
    ===================================================== */

    const onInputKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          sendMessage();
        }
      };

    /* =====================================================
       NEW CONVERSATION
    ===================================================== */

    const startNewConversation =
      () => {
        requestAbortRef.current =
          true;

        try {
          recognitionRef.current
            ?.stop();
        } catch {
          // Ignore.
        }

        setMessages([]);
        setConversationId(
          null
        );
        setInput("");
        setAttachments([]);
        setError("");
        setIsLoading(
          false
        );

        localStorage.removeItem(
          STORAGE_KEYS.messages
        );

        localStorage.removeItem(
          STORAGE_KEYS.conversationId
        );

        window.setTimeout(
          () =>
            textAreaRef
              .current
              ?.focus(),
          100
        );
      };

    /* =====================================================
       PLACEHOLDER
    ===================================================== */

    const placeholder =
      useMemo(
        () => {
          if (
            isListening
          ) {
            return "Listening… speak naturally";
          }

          if (
            hasMessages
          ) {
            return "Ask a follow-up…";
          }

          return "Ask anything… business, steel, calculations or knowledge";
        },
        [
          hasMessages,
          isListening,
        ]
      );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <>
        <button
          type="button"
          className={`bharat-ai-overlay ${
            isOpen
              ? "bharat-ai-overlay-visible"
              : ""
          }`}
          onClick={() =>
            setIsOpen(
              false
            )
          }
          aria-label="Close Bharat Intelligence"
        />

        <aside
          className={`bharat-ai-panel bharat-ai-panel-next ${
            isOpen
              ? "bharat-ai-panel-open"
              : ""
          }`}
          aria-hidden={
            !isOpen
          }
        >
          {/* HEADER */}

          <header className="bharat-ai-header bharat-ai-header-next">
            <div className="bharat-ai-brand">
              <div className="bharat-ai-brand-logo bharat-ai-brand-logo-next">
                <Icon
                  name="sparkles"
                  size={19}
                />
              </div>

              <div>
                <div className="bharat-ai-brand-title-row">
                  <h3>
                    Bharat Intelligence
                  </h3>

                  <span className="bharat-ai-beta bharat-ai-beta-next">
                    AI
                  </span>
                </div>

                <p>
                  Business · Knowledge · Decisions
                </p>
              </div>
            </div>

            <div className="bharat-ai-header-actions">
              <button
                type="button"
                className="bharat-ai-header-button"
                title="New conversation"
                onClick={
                  startNewConversation
                }
              >
                <Icon
                  name="plus"
                  size={18}
                />
              </button>

              {hasMessages && (
                <button
                  type="button"
                  className="bharat-ai-header-button bharat-ai-clear-button"
                  title="Clear conversation"
                  onClick={
                    startNewConversation
                  }
                >
                  <Icon
                    name="trash"
                    size={16}
                  />
                </button>
              )}

              <button
                type="button"
                className="bharat-ai-header-button"
                title="Close"
                onClick={() =>
                  setIsOpen(
                    false
                  )
                }
              >
                <Icon
                  name="close"
                  size={19}
                />
              </button>
            </div>
          </header>

          {/* USER STRIP */}

          {currentUser && (
            <div className="bharat-ai-user-strip bharat-ai-user-strip-next">
              <div className="bharat-ai-user-strip-avatar">
                {getFirstName(
                  currentUser
                )
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "B"}
              </div>

              <div className="bharat-ai-user-strip-copy">
                <strong>
                  {
                    currentUser.name
                  }
                </strong>

                <span>
                  Ask naturally in English,
                  Hindi or Hinglish
                </span>
              </div>

              <div className="bharat-ai-online-indicator">
                <span />
                Ready
              </div>
            </div>
          )}

          {/* BODY */}

          <main className="bharat-ai-body">
            {!hasMessages &&
              !isLoading && (
                <Welcome
                  currentUser={
                    currentUser
                  }
                  isUserLoading={
                    isUserLoading
                  }
                  onSuggestionClick={
                    sendMessage
                  }
                />
              )}

            {hasMessages && (
              <div className="bharat-ai-conversation bharat-ai-conversation-next">
                {messages.map(
                  (
                    message
                  ) => (
                    <Message
                      key={
                        message.id
                      }
                      message={
                        message
                      }
                      onSuggestionClick={
                        sendMessage
                      }
                    />
                  )
                )}

                {isLoading && (
                  <ThinkingState
                    stage={
                      thinkingStage
                    }
                  />
                )}

                {error && (
                  <div className="bharat-ai-error bharat-ai-error-clean">
                    <div className="bharat-ai-error-icon">
                      !
                    </div>

                    <div>
                      <strong>
                        Unable to complete request
                      </strong>

                      <span>
                        {error}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setError(
                          ""
                        )
                      }
                    >
                      <Icon
                        name="close"
                        size={13}
                      />
                    </button>
                  </div>
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            )}
          </main>

          {/* COMPOSER */}

          <footer className="bharat-ai-composer-section bharat-ai-composer-section-next">
            {attachments.length >
              0 && (
              <div className="bharat-ai-attachment-tray">
                {attachments.map(
                  (
                    attachment
                  ) => (
                    <AttachmentChip
                      key={
                        attachment.id
                      }
                      attachment={
                        attachment
                      }
                      onRemove={
                        removeAttachment
                      }
                    />
                  )
                )}
              </div>
            )}

            {isListening && (
              <div className="bharat-ai-listening-bar">
                <span className="bharat-ai-listening-dot" />

                <span>
                  Listening — English,
                  Hindi or Hinglish
                </span>

                <button
                  type="button"
                  onClick={
                    toggleVoice
                  }
                >
                  Stop
                </button>
              </div>
            )}

            <div
              className={`bharat-ai-composer bharat-ai-composer-next ${
                isLoading
                  ? "bharat-ai-composer-loading"
                  : ""
              } ${
                isListening
                  ? "bharat-ai-composer-listening"
                  : ""
              }`}
            >
              <textarea
                ref={
                  textAreaRef
                }
                value={
                  input
                }
                rows={1}
                disabled={
                  isLoading
                }
                placeholder={
                  placeholder
                }
                onChange={(
                  event
                ) =>
                  setInput(
                    event.target
                      .value
                  )
                }
                onKeyDown={
                  onInputKeyDown
                }
              />

              <div className="bharat-ai-composer-bottom bharat-ai-composer-bottom-next">
                <div className="bharat-ai-composer-tools">
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    multiple
                    hidden
                    accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,image/*"
                    onChange={
                      handleFileChange
                    }
                  />

                  <button
                    type="button"
                    className="bharat-ai-tool-button"
                    onClick={() =>
                      fileInputRef.current
                        ?.click()
                    }
                    disabled={
                      isLoading
                    }
                    title="Attach file"
                  >
                    <Icon
                      name="paperclip"
                      size={17}
                    />
                  </button>

                  {speechSupported && (
                    <button
                      type="button"
                      className={`bharat-ai-tool-button bharat-ai-mic-button ${
                        isListening
                          ? "bharat-ai-mic-active"
                          : ""
                      }`}
                      onClick={
                        toggleVoice
                      }
                      disabled={
                        isLoading
                      }
                      title={
                        isListening
                          ? "Stop listening"
                          : "Speak"
                      }
                    >
                      <Icon
                        name={
                          isListening
                            ? "stop"
                            : "mic"
                        }
                        size={17}
                      />
                    </button>
                  )}

                  <span className="bharat-ai-composer-hint">
                    {speechSupported
                      ? "Type or speak naturally"
                      : "Enter to send"}
                  </span>
                </div>

                <button
                  type="button"
                  className="bharat-ai-send-button bharat-ai-send-button-next"
                  disabled={
                    isLoading ||
                    !input.trim()
                  }
                  onClick={() =>
                    sendMessage()
                  }
                  aria-label="Send"
                >
                  <Icon
                    name="send"
                    size={17}
                  />
                </button>
              </div>
            </div>

            <div className="bharat-ai-composer-meta">
              Bharat Intelligence can
              understand follow-ups,
              Hinglish and business
              context.
            </div>
          </footer>
        </aside>

        {/* GLOBAL LAUNCHER */}

        {!isOpen && (
          <button
            type="button"
            className="bharat-ai-launcher bharat-ai-launcher-next"
            onClick={() =>
              setIsOpen(
                true
              )
            }
            aria-label="Open Bharat Intelligence"
          >
            <div className="bharat-ai-launcher-glow" />

            <div className="bharat-ai-launcher-icon bharat-ai-launcher-icon-next">
              <Icon
                name="sparkles"
                size={20}
              />
            </div>

            <div className="bharat-ai-launcher-copy">
              <strong>
                Ask Bharat
              </strong>

              <span>
                Intelligence
              </span>
            </div>

            <span className="bharat-ai-launcher-chevron">
              <Icon
                name="chevron"
                size={15}
              />
            </span>
          </button>
        )}
      </>
    );
  };

export default BharatIntelligence;