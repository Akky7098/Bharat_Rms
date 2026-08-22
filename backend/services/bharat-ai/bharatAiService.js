const {
  getProvider,
} = require(
  "./providers/aiProvider"
);

const {
  executeTool,
} = require(
  "./toolRegistry"
);

const {
  buildBharatAiSystemPrompt,
} = require(
  "./prompts/bharatAiSystemPrompt"
);

const {
  buildBusinessPrompt,
  buildGeneralPrompt,
  buildWebPrompt,
  buildSynthesisPrompt,
} = require(
  "./prompts/hybridPrompts"
);

const {
  getConversation,
  saveConversation,
} = require(
  "./conversation/conversationService"
);

const {
  resolveConversationContext,
} = require(
  "./conversation/contextResolver"
);

const {
  mergeContext,
} = require(
  "./conversation/conversationStateService"
);

const {
  classifyRequest,
} = require(
  "./classifier/requestClassifier"
);

const {
  routeRequest,
  ROUTES,
} = require(
  "./router/requestRouter"
);

const {
  selectToolGroups,
} = require(
  "./router/toolSelectionService"
);

const {
  solveMathLocally,
} = require(
  "./math/mathService"
);

const {
  detectDocumentIntent,
  extractDocumentSearch,
} = require(
  "./documents/documentIntentService"
);

const {
  searchDocuments,
} = require(
  "./tools/documentTools"
);

const {
  buildSuggestions,
} = require(
  "./suggestions/suggestionService"
);

const {
  getBusinessClockContext,
} = require(
  "./utils/businessTime"
);

const {
  logUsage,
  logAudit,
} = require(
  "./usage/usageService"
);

/* =========================================================
   LIMITS
========================================================= */

const MAX_TOOL_ROUNDS =
  Math.max(
    1,
    Number(
      process.env
        .BHARAT_AI_MAX_TOOL_ROUNDS ||
        6
    )
  );

const MAX_MESSAGE_CHARS =
  Math.max(
    1000,
    Number(
      process.env
        .BHARAT_AI_MAX_MESSAGE_CHARS ||
        8000
    )
  );

const MAX_HISTORY_MESSAGES =
  Math.max(
    2,
    Number(
      process.env
        .BHARAT_AI_MAX_HISTORY_MESSAGES ||
        8
    )
  );

/* =========================================================
   EMPTY USAGE
========================================================= */

const emptyUsage = () => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});

/* =========================================================
   HISTORY
========================================================= */

const toGeminiHistory = (
  messages
) =>
  (
    messages || []
  )
    .slice(
      -MAX_HISTORY_MESSAGES
    )
    .flatMap(
      (
        message
      ) => {
        if (
          !message
            ?.content
        ) {
          return [];
        }

        return [
          {
            role:
              message.role ===
              "assistant"
                ? "model"
                : "user",

            parts: [
              {
                text:
                  String(
                    message.content
                  ),
              },
            ],
          },
        ];
      }
    );

/* =========================================================
   EXTRACT TEXT

   IMPORTANT FOR GEMINI FUNCTION CALLING

   Gemini can return:
   - text
   - functionCall
   - other non-text parts

   A functionCall-only response is NOT an error.

   We inspect candidate parts first instead of calling
   response.text immediately. This avoids the SDK warning:

   "there are non-text parts functionCall in the response"
========================================================= */

const extractText = (
  response
) => {
  const parts =
    response
      ?.candidates?.[0]
      ?.content
      ?.parts ||
    [];

  const text =
    parts
      .filter(
        (
          part
        ) =>
          typeof part
            ?.text ===
          "string"
      )
      .map(
        (
          part
        ) =>
          part.text
      )
      .join("\n")
      .trim();

  if (text) {
    return text;
  }

  /*
   * Some custom provider wrappers may return:
   *
   * {
   *   text: "answer"
   * }
   *
   * Only use this fallback when Gemini candidate parts
   * are absent. This prevents function-call warnings.
   */

  if (
    parts.length ===
      0 &&
    typeof response
      ?.text ===
      "string"
  ) {
    return response.text.trim();
  }

  /*
   * Empty text can be valid when Gemini wants a tool.
   */

  return "";
};

/* =========================================================
   FUNCTION CALL EXTRACTION
========================================================= */

const extractFunctionCalls = (
  response
) => {
  const parts =
    response
      ?.candidates?.[0]
      ?.content
      ?.parts ||
    [];

  return parts
    .map(
      (
        part
      ) =>
        part
          ?.functionCall
    )
    .filter(
      Boolean
    );
};

/* =========================================================
   FINISH REASON
========================================================= */

const getFinishReason = (
  response
) => {
  return (
    response
      ?.candidates?.[0]
      ?.finishReason ||
    "UNKNOWN"
  );
};

/* =========================================================
   USAGE
========================================================= */

const extractUsageSafe = (
  provider,
  response
) => {
  try {
    if (
      typeof provider
        ?.extractUsage ===
      "function"
    ) {
      return {
        ...emptyUsage(),

        ...provider.extractUsage(
          response
        ),
      };
    }
  } catch (error) {
    console.log(
      "BHARAT AI USAGE EXTRACTION FAILED =>",
      error?.message ||
        error
    );
  }

  return emptyUsage();
};

/* =========================================================
   COMBINE USAGE
========================================================= */

const combineUsage = (
  ...items
) =>
  items.reduce(
    (
      total,
      item
    ) => {
      total.inputTokens +=
        Number(
          item
            ?.inputTokens ||
            0
        );

      total.outputTokens +=
        Number(
          item
            ?.outputTokens ||
            0
        );

      total.totalTokens +=
        Number(
          item
            ?.totalTokens ||
            0
        );

      return total;
    },
    emptyUsage()
  );

/* =========================================================
   PROVIDER NAME
========================================================= */

const getProviderName = (
  provider
) =>
  provider?.name ||
  process.env
    .BHARAT_AI_PROVIDER ||
  "gemini";

/* =========================================================
   MODEL NAME
========================================================= */

const getModelName = (
  provider
) => {
  if (
    typeof provider
      ?.getModel ===
    "function"
  ) {
    return provider.getModel();
  }

  return (
    process.env
      .GEMINI_MODEL ||
    "gemini-3.6-flash"
  );
};

/* =========================================================
   CONTENTS
========================================================= */

const buildContents = ({
  conversationMessages,
  message,
}) => [
  ...toGeminiHistory(
    conversationMessages
  ),

  {
    role:
      "user",

    parts: [
      {
        text:
          String(
            message || ""
          ),
      },
    ],
  },
];

/* =========================================================
   SIMPLE AI RESPONSE

   Used for:
   - general knowledge
   - technical explanation
   - synthesis
   - fallback

   No Bharat business tools are exposed here.
========================================================= */

const generateSimpleResponse =
  async ({
    provider,
    message,
    conversationMessages = [],
    systemInstruction,
  }) => {
    /* =====================================================
       PROVIDER-SPECIFIC GENERAL METHOD
    ===================================================== */

    if (
      typeof provider
        ?.generateGeneral ===
      "function"
    ) {
      const result =
        await provider
          .generateGeneral({
            message,

            history:
              conversationMessages.slice(
                -MAX_HISTORY_MESSAGES
              ),

            systemInstruction,
          });

      /*
       * Provider may already return normalized result.
       */

      if (
        result?.answer !==
        undefined
      ) {
        return {
          answer:
            String(
              result.answer ||
                ""
            ).trim(),

          usage:
            result.usage ||
            emptyUsage(),

          model:
            result.model ||
            getModelName(
              provider
            ),
        };
      }

      return {
        answer:
          extractText(
            result
          ),

        usage:
          extractUsageSafe(
            provider,
            result
          ),

        model:
          getModelName(
            provider
          ),
      };
    }

    /* =====================================================
       GENERIC PROVIDER
    ===================================================== */

    const response =
      await provider.generate({
        contents:
          buildContents({
            conversationMessages,
            message,
          }),

        systemInstruction,

        /*
         * No Bharat tools for general questions.
         */

        toolGroups:
          [],
      });

    const answer =
      extractText(
        response
      );

    /*
     * General generation should not normally request
     * a Bharat function because toolGroups=[].
     */

    return {
      answer,

      usage:
        extractUsageSafe(
          provider,
          response
        ),

      model:
        getModelName(
          provider
        ),
    };
  };

/* =========================================================
   BUSINESS TOOL LOOP

   THIS IS THE IMPORTANT FUNCTION.

   Correct sequence:

   Gemini
      ↓
   functionCall
      ↓
   executeTool()
      ↓
   functionResponse
      ↓
   Gemini
      ↓
   final text

   We intentionally DO NOT bypass this through
   provider.generateBusiness() because Bharat Intelligence
   owns tool execution, permissions and auditing.
========================================================= */

const generateBusinessResponse =
  async ({
    provider,
    message,
    conversationMessages,
    systemInstruction,
    requestingUser,
    toolGroups = [],
  }) => {
    const contents =
      buildContents({
        conversationMessages,
        message,
      });

    const toolsUsed =
      [];

    let totalInputTokens =
      0;

    let totalOutputTokens =
      0;

    let totalTokens =
      0;

    let finalAnswer =
      "";

    /* =====================================================
       TOOL ROUNDS
    ===================================================== */

    for (
      let round = 0;
      round <
      MAX_TOOL_ROUNDS;
      round += 1
    ) {
      const response =
        await provider.generate({
          contents,

          systemInstruction,

          toolGroups,
        });

      /* ===================================================
         USAGE
      =================================================== */

      const usage =
        extractUsageSafe(
          provider,
          response
        );

      totalInputTokens +=
        Number(
          usage.inputTokens ||
            0
        );

      totalOutputTokens +=
        Number(
          usage.outputTokens ||
            0
        );

      totalTokens +=
        Number(
          usage.totalTokens ||
            0
        );

      /* ===================================================
         MODEL CONTENT
      =================================================== */

      const modelContent =
        response
          ?.candidates?.[0]
          ?.content;

      if (
        !modelContent
      ) {
        throw new Error(
          "Gemini returned no candidate content."
        );
      }

      /*
       * IMPORTANT:
       *
       * Preserve the COMPLETE Gemini model response.
       * Do not reconstruct only functionCall fields.
       *
       * Gemini may attach metadata/signatures to parts.
       */

      contents.push(
        modelContent
      );

      /* ===================================================
         FUNCTION CALLS
      =================================================== */

      const functionCalls =
        extractFunctionCalls(
          response
        );

      /* ===================================================
         NO FUNCTION CALL
         → THIS SHOULD BE FINAL TEXT
      =================================================== */

      if (
        functionCalls.length ===
        0
      ) {
        const text =
          extractText(
            response
          );

        if (text) {
          finalAnswer =
            text;

          break;
        }

        /*
         * If there is neither a function call nor text,
         * this is genuinely invalid.
         */

        throw new Error(
          `Gemini returned no text and no function call. Finish reason: ${getFinishReason(
            response
          )}.`
        );
      }

      /* ===================================================
         EXECUTE ALL FUNCTION CALLS

         Gemini may request more than one tool in one turn.
      =================================================== */

      const functionResponseParts =
        [];

      for (
        const functionCall of
        functionCalls
      ) {
        const name =
          String(
            functionCall
              ?.name ||
              ""
          ).trim();

        const args =
          functionCall
            ?.args ||
          {};

        if (!name) {
          functionResponseParts.push({
            functionResponse: {
              ...(functionCall
                ?.id
                ? {
                    id:
                      functionCall.id,
                  }
                : {}),

              name:
                "unknown_function",

              response: {
                success:
                  false,

                error:
                  "Gemini requested a function without a valid name.",
              },
            },
          });

          continue;
        }

        let success =
          true;

        let payload;

        try {
          payload =
            await executeTool({
              toolName:
                name,

              args,

              requestingUser,
            });
        } catch (error) {
          success =
            false;

          payload = {
            error:
              error
                ?.message ||
              "Tool execution failed.",

            statusCode:
              Number(
                error
                  ?.statusCode
              ) ||
              500,
          };
        }

        /* =================================================
           AUDIT TOOL EXECUTION
        ================================================= */

        toolsUsed.push({
          name,
          success,
        });

        /* =================================================
           RETURN RESULT TO GEMINI

           Keep id if Gemini supplied one.

           IMPORTANT:
           Function responses are not final assistant text.
           They become the next input to Gemini.
        ================================================= */

        functionResponseParts.push({
          functionResponse: {
            ...(functionCall
              ?.id
              ? {
                  id:
                    functionCall.id,
                }
              : {}),

            name,

            response: {
              success,

              ...(success
                ? {
                    data:
                      payload,
                  }
                : {
                    error:
                      payload
                        ?.error ||
                      "Tool execution failed.",

                    statusCode:
                      payload
                        ?.statusCode ||
                      500,
                  }),
            },
          },
        });
      }

      /* ===================================================
         SEND TOOL RESULTS BACK TO GEMINI
      =================================================== */

      contents.push({
        role:
          "user",

        parts:
          functionResponseParts,
      });
    }

    /* =====================================================
       MAX ROUND PROTECTION
    ===================================================== */

    if (
      !finalAnswer
    ) {
      throw new Error(
        `Bharat Intelligence reached ${MAX_TOOL_ROUNDS} tool rounds without a final answer.`
      );
    }

    return {
      answer:
        finalAnswer,

      toolsUsed,

      usage: {
        inputTokens:
          totalInputTokens,

        outputTokens:
          totalOutputTokens,

        totalTokens,
      },

      model:
        getModelName(
          provider
        ),
    };
  };

/* =========================================================
   WEB
========================================================= */

const generateWebResponse =
  async ({
    provider,
    message,
    conversationMessages,
    systemInstruction,
  }) => {
    const enabled =
      String(
        process.env
          .GEMINI_WEB_SEARCH_ENABLED ||
          "false"
      ).toLowerCase() ===
      "true";

    if (!enabled) {
      return {
        answer:
          "Live market research is not enabled yet. I can explain the topic generally, but I should not present current prices or latest news without live verification.",

        usage:
          emptyUsage(),

        sources:
          [],

        toolsUsed:
          [],

        model:
          getModelName(
            provider
          ),
      };
    }

    if (
      typeof provider
        ?.generateWeb !==
      "function"
    ) {
      return {
        answer:
          "Live research is configured but the AI provider does not yet support web grounding.",

        usage:
          emptyUsage(),

        sources:
          [],

        toolsUsed:
          [],

        model:
          getModelName(
            provider
          ),
      };
    }

    const result =
      await provider
        .generateWeb({
          message,

          history:
            conversationMessages.slice(
              -MAX_HISTORY_MESSAGES
            ),

          systemInstruction,
        });

    return {
      answer:
        result?.answer ||
        extractText(
          result
        ),

      usage:
        result?.usage ||
        extractUsageSafe(
          provider,
          result
        ),

      sources:
        Array.isArray(
          result?.sources
        )
          ? result.sources
          : [],

      toolsUsed:
        Array.isArray(
          result?.toolsUsed
        )
          ? result.toolsUsed
          : [],

      model:
        result?.model ||
        getModelName(
          provider
        ),
    };
  };

/* =========================================================
   DOCUMENT
========================================================= */

const handleDocumentRequest =
  async ({
    message,
    requestingUser,
  }) => {
    const intent =
      detectDocumentIntent(
        message
      );

    const search =
      String(
        extractDocumentSearch(
          intent?.search ||
            message
        ) ||
          ""
      )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (!search) {
      return {
        answer:
          "Which Bharat document would you like me to find?",

        documents:
          [],

        suggestions: [
          "Show Bharat tool steel brochure",
          "Show available catalogues",
        ],

        usage:
          emptyUsage(),

        model:
          "bharat-document-search",
      };
    }

    const result =
      await searchDocuments({
        requestingUser,

        search,

        limit:
          8,
      });

    const documents =
      Array.isArray(
        result?.documents
      )
        ? result.documents
        : [];

    if (
      !documents.length
    ) {
      return {
        answer:
          `I couldn't find an accessible Bharat document matching "${search}".`,

        documents:
          [],

        suggestions: [
          "Show available brochures",
          "Search tool steel documents",
        ],

        usage:
          emptyUsage(),

        model:
          "bharat-document-search",
      };
    }

    return {
      answer:
        documents.length ===
        1
          ? `I found "${documents[0].title}".`
          : `I found ${documents.length} matching Bharat documents.`,

      documents,

      suggestions:
        documents
          .slice(
            0,
            4
          )
          .map(
            (
              document
            ) =>
              `Open ${document.title}`
          ),

      usage:
        emptyUsage(),

      model:
        "bharat-document-search",
    };
  };

/* =========================================================
   SAVE TURN + CONVERSATION STATE
========================================================= */

const saveTurn =
  async ({
    conversation,
    requestingUser,
    userMessage,
    assistantMessage,
    context,
  }) => {
    await saveConversation({
      userId:
        requestingUser._id,

      conversationId:
        conversation
          .conversationId,

      messages: [
        ...(
          conversation
            ?.messages ||
          []
        ),

        {
          role:
            "user",

          content:
            userMessage,
        },

        {
          role:
            "assistant",

          content:
            assistantMessage,
        },
      ],

      context,
    });
  };

/* =========================================================
   SUCCESS LOGGING
========================================================= */

const logSuccess = ({
  requestingUser,
  conversationId,
  question,
  requestType,
  providerName,
  model,
  toolsUsed,
  answer,
  usage,
  latencyMs,
}) => {
  Promise.resolve(
    logUsage({
      userId:
        requestingUser._id,

      conversationId,

      provider:
        providerName,

      model,

      requestType,

      inputTokens:
        Number(
          usage
            ?.inputTokens ||
            0
        ),

      outputTokens:
        Number(
          usage
            ?.outputTokens ||
            0
        ),

      totalTokens:
        Number(
          usage
            ?.totalTokens ||
            0
        ),

      toolCalls:
        (
          toolsUsed ||
          []
        ).length,

      latencyMs,

      success:
        true,
    })
  ).catch(
    (
      error
    ) => {
      console.log(
        "AI usage log write failed:",
        error?.message ||
          error
      );
    }
  );

  Promise.resolve(
    logAudit({
      userId:
        requestingUser._id,

      userName:
        requestingUser.name,

      userEmail:
        requestingUser.email,

      role:
        requestingUser.role,

      conversationId,

      question,

      requestType,

      provider:
        providerName,

      model,

      toolsUsed:
        toolsUsed ||
        [],

      answer,

      success:
        true,
    })
  ).catch(
    (
      error
    ) => {
      console.log(
        "AI audit log write failed:",
        error?.message ||
          error
      );
    }
  );
};

/* =========================================================
   FAILURE LOGGING
========================================================= */

const logFailure = ({
  requestingUser,
  conversationId,
  question,
  requestType,
  providerName,
  model,
  toolsUsed,
  usage,
  latencyMs,
  error,
}) => {
  Promise.resolve(
    logUsage({
      userId:
        requestingUser._id,

      conversationId,

      provider:
        providerName,

      model,

      requestType,

      inputTokens:
        Number(
          usage
            ?.inputTokens ||
            0
        ),

      outputTokens:
        Number(
          usage
            ?.outputTokens ||
            0
        ),

      totalTokens:
        Number(
          usage
            ?.totalTokens ||
            0
        ),

      toolCalls:
        (
          toolsUsed ||
          []
        ).length,

      latencyMs,

      success:
        false,

      errorMessage:
        error
          ?.message ||
        "Unknown Bharat Intelligence error.",
    })
  ).catch(
    (
      logError
    ) => {
      console.log(
        "AI usage failure log write failed:",
        logError?.message ||
          logError
      );
    }
  );

  Promise.resolve(
    logAudit({
      userId:
        requestingUser._id,

      userName:
        requestingUser.name,

      userEmail:
        requestingUser.email,

      role:
        requestingUser.role,

      conversationId,

      question,

      requestType,

      provider:
        providerName,

      model,

      toolsUsed:
        toolsUsed ||
        [],

      answer:
        "",

      success:
        false,

      errorMessage:
        error
          ?.message ||
        "Unknown Bharat Intelligence error.",
    })
  ).catch(
    (
      logError
    ) => {
      console.log(
        "AI audit failure log write failed:",
        logError?.message ||
          logError
      );
    }
  );
};

/* =========================================================
   MAIN AGENT
========================================================= */

const askBharatAi =
  async ({
    message,
    conversationId,
    requestingUser,
  }) => {
    const startedAt =
      Date.now();

    const cleanMessage =
      String(
        message || ""
      ).trim();

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !cleanMessage
    ) {
      const error =
        new Error(
          "Message is required."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      cleanMessage.length >
      MAX_MESSAGE_CHARS
    ) {
      const error =
        new Error(
          `Message is too long. Maximum ${MAX_MESSAGE_CHARS} characters allowed.`
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      !requestingUser
        ?._id
    ) {
      const error =
        new Error(
          "Authenticated user is required."
        );

      error.statusCode =
        401;

      throw error;
    }

    /* =====================================================
       PROVIDER
    ===================================================== */

    const provider =
      getProvider();

    const providerName =
      getProviderName(
        provider
      );

    const model =
      getModelName(
        provider
      );

    /* =====================================================
       CONVERSATION + REDIS STATE
    ===================================================== */

    const conversation =
      await getConversation({
        userId:
          requestingUser._id,

        conversationId,
      });

    /* =====================================================
       DETERMINISTIC AGENT CONTEXT

       No Gemini token cost.

       Handles things such as:
       - aaj
       - kal
       - full detail
       - aur Renu?
       - pending only
       - previous subject/domain/period
    ===================================================== */

    const resolved =
      resolveConversationContext({
        message:
          cleanMessage,

        previousContext:
          conversation.context,
      });

    let conversationContext =
      resolved.context;

    const canonicalMessage =
      resolved
        .canonicalMessage;

    /* =====================================================
       CLASSIFICATION
    ===================================================== */

    const requestType =
      classifyRequest(
        canonicalMessage
      );

    let routeInfo =
      routeRequest(
        canonicalMessage
      );

    /* =====================================================
       CONTEXT RESOLVER CAN FORCE BUSINESS ROUTE
    ===================================================== */

    if (
      resolved.routeHint ===
      "BUSINESS"
    ) {
      routeInfo = {
        ...routeInfo,

        route:
          ROUTES.BUSINESS,

        domains:
          conversationContext
            .domains
            ?.length
            ? conversationContext
                .domains
            : conversationContext
                .domain
              ? [
                  conversationContext
                    .domain,
                ]
              : [],
      };
    }

    /* =====================================================
       PRESERVE RESOLVED PERIOD
    ===================================================== */

    if (
      conversationContext
        .period
    ) {
      routeInfo = {
        ...routeInfo,

        period: {
          matched:
            true,

          ...conversationContext
            .period,
        },
      };
    }

    /* =====================================================
       RESPONSE STATE
    ===================================================== */

    let finalAnswer =
      "";

    let suggestions =
      [];

    let toolsUsed =
      [];

    let sources =
      [];

    let documents =
      [];

    let usage =
      emptyUsage();

    let responseModel =
      model;

    let responseProvider =
      providerName;

    try {
      /* ===================================================
         DETERMINISTIC CLARIFICATION

         If backend already has period/context, Gemini is
         never allowed to unnecessarily ask for it again.
      =================================================== */

      if (
        resolved
          .needsClarification
      ) {
        finalAnswer =
          resolved
            .clarification
            .answer;

        suggestions =
          resolved
            .clarification
            .suggestions ||
          [];

        await saveTurn({
          conversation,

          requestingUser,

          userMessage:
            cleanMessage,

          assistantMessage:
            finalAnswer,

          context:
            conversationContext,
        });

        logSuccess({
          requestingUser,

          conversationId:
            conversation
              .conversationId,

          question:
            cleanMessage,

          requestType,

          providerName:
            "local",

          model:
            "bharat-context-resolver",

          toolsUsed:
            [],

          answer:
            finalAnswer,

          usage:
            emptyUsage(),

          latencyMs:
            Date.now() -
            startedAt,
        });

        return {
          answer:
            finalAnswer,

          conversationId:
            conversation
              .conversationId,

          requestType,

          route:
            routeInfo.route,

          clarification:
            resolved
              .clarification
              .type,

          resolvedPeriod:
            null,

          suggestions,

          toolsUsed:
            [],

          sources:
            [],

          documents:
            [],

          usage:
            emptyUsage(),

          model:
            "bharat-context-resolver",

          provider:
            "local",

          generatedAt:
            new Date(),

          businessClock:
            getBusinessClockContext(),
        };
      }

      /* ===================================================
         DAILY ACTIVITY

         DIRECT TOOL CALL.

         Examples:
         - Aaj maine kya kiya?
         - Aaj Shalu ne kya kiya?

         No need for Gemini to decide the first tool.
      =================================================== */

      if (
        conversationContext
          .intent ===
        "daily_activity"
      ) {
        const period =
          conversationContext
            .period;

        if (
          !period
            ?.dateFrom
        ) {
          const error =
            new Error(
              "A date is required for daily activity."
            );

          error.statusCode =
            400;

          throw error;
        }

        const args = {
          date:
            period.dateFrom,
        };

        if (
          conversationContext
            .subject &&
          conversationContext
            .subject !==
            "self"
        ) {
          args.employeeName =
            conversationContext
              .subject;
        }

        let payload;

        try {
          payload =
            await executeTool({
              toolName:
                "get_daily_activity_summary",

              args,

              requestingUser,
            });

          toolsUsed.push({
            name:
              "get_daily_activity_summary",

            success:
              true,
          });
        } catch (error) {
          toolsUsed.push({
            name:
              "get_daily_activity_summary",

            success:
              false,
          });

          throw error;
        }

        if (
          payload
            ?.ambiguous
        ) {
          finalAnswer =
            "I found more than one matching employee. Please select the employee you mean.";

          suggestions =
            (
              payload
                .matches ||
              []
            )
              .map(
                (
                  employee
                ) =>
                  employee
                    ?.name
              )
              .filter(
                Boolean
              );
        } else if (
          !payload
            ?.found
        ) {
          finalAnswer =
            "I could not find matching activity data for that employee/date.";
        } else {
          finalAnswer =
            payload.answer ||
            "Activity data was found.";
        }

        responseModel =
          "bharat-local-business";

        responseProvider =
          "local";

        conversationContext =
          mergeContext(
            conversationContext,
            {
              lastTool:
                "get_daily_activity_summary",

              lastResultType:
                "daily_activity",
            }
          );
      }

      /* ===================================================
         MATH
      =================================================== */

      else if (
        routeInfo.route ===
        ROUTES.MATH
      ) {
        const local =
          solveMathLocally(
            canonicalMessage
          );

        if (
          local
            ?.success
        ) {
          finalAnswer =
            local.answer;

          responseModel =
            "bharat-local-math";

          responseProvider =
            "local";
        } else {
          const result =
            await generateSimpleResponse({
              provider,

              message:
                cleanMessage,

              conversationMessages:
                conversation
                  .messages,

              systemInstruction:
                buildGeneralPrompt({
                  user:
                    requestingUser,
                }),
            });

          finalAnswer =
            result.answer;

          usage =
            result.usage;

          responseModel =
            result.model;
        }
      }

      /* ===================================================
         GENERAL KNOWLEDGE
      =================================================== */

      else if (
        routeInfo.route ===
        ROUTES.GENERAL
      ) {
        const result =
          await generateSimpleResponse({
            provider,

            message:
              cleanMessage,

            conversationMessages:
              conversation
                .messages,

            systemInstruction:
              buildGeneralPrompt({
                user:
                  requestingUser,
              }),
          });

        finalAnswer =
          result.answer;

        usage =
          result.usage;

        responseModel =
          result.model;
      }

      /* ===================================================
         BHARAT DOCUMENT SEARCH
      =================================================== */

      else if (
        routeInfo.route ===
        ROUTES.DOCUMENT
      ) {
        const result =
          await handleDocumentRequest({
            message:
              cleanMessage,

            requestingUser,
          });

        finalAnswer =
          result.answer;

        documents =
          result.documents ||
          [];

        suggestions =
          result.suggestions ||
          [];

        usage =
          result.usage ||
          emptyUsage();

        responseModel =
          result.model;

        responseProvider =
          "local";
      }

      /* ===================================================
         LIVE WEB
      =================================================== */

      else if (
        routeInfo.route ===
        ROUTES.WEB
      ) {
        const result =
          await generateWebResponse({
            provider,

            message:
              cleanMessage,

            conversationMessages:
              conversation
                .messages,

            systemInstruction:
              buildWebPrompt({
                user:
                  requestingUser,
              }),
          });

        finalAnswer =
          result.answer;

        usage =
          result.usage;

        sources =
          result.sources ||
          [];

        toolsUsed =
          result.toolsUsed ||
          [];

        responseModel =
          result.model;
      }

      /* ===================================================
         BHARAT BUSINESS DATA

         This now ALWAYS uses our own function-call loop.
      =================================================== */

      else if (
        routeInfo.route ===
        ROUTES.BUSINESS
      ) {
        const toolGroups =
          selectToolGroups(
            routeInfo
          );

        const result =
          await generateBusinessResponse({
            provider,

            message:
              canonicalMessage,

            conversationMessages:
              conversation
                .messages,

            systemInstruction:
              buildBusinessPrompt({
                user:
                  requestingUser,

                routeInfo,
              }),

            requestingUser,

            toolGroups,
          });

        finalAnswer =
          result.answer;

        usage =
          result.usage ||
          emptyUsage();

        toolsUsed =
          result.toolsUsed ||
          [];

        responseModel =
          result.model ||
          model;

        /* =================================================
           STORE LAST SUCCESSFUL BUSINESS TOOL
        ================================================= */

        const successfulTool =
          toolsUsed
            .filter(
              (
                tool
              ) =>
                tool.success
            )
            .slice(
              -1
            )[0];

        if (
          successfulTool
            ?.name
        ) {
          conversationContext =
            mergeContext(
              conversationContext,
              {
                lastTool:
                  successfulTool
                    .name,

                lastResultType:
                  conversationContext
                    .domain,
              }
            );
        }
      }

      /* ===================================================
         HYBRID

         Bharat facts + external/general reasoning.
      =================================================== */

      else if (
        routeInfo.route ===
        ROUTES.HYBRID
      ) {
        const toolGroups =
          selectToolGroups(
            routeInfo
          );

        const business =
          await generateBusinessResponse({
            provider,

            message:
              canonicalMessage,

            conversationMessages:
              conversation
                .messages,

            systemInstruction:
              buildBusinessPrompt({
                user:
                  requestingUser,

                routeInfo,
              }),

            requestingUser,

            toolGroups,
          });

        toolsUsed =
          business
            .toolsUsed ||
          [];

        let external =
          null;

        if (
          routeInfo
            ?.needsWeb
        ) {
          external =
            await generateWebResponse({
              provider,

              message:
                cleanMessage,

              conversationMessages:
                [],

              systemInstruction:
                buildWebPrompt({
                  user:
                    requestingUser,
                }),
            });

          sources =
            external
              ?.sources ||
            [];
        }

        /* =================================================
           SYNTHESIS

           Send summarized Bharat answer, not raw DB data.
        ================================================= */

        const synthesis =
          await generateSimpleResponse({
            provider,

            message: [
              `Original question:\n${cleanMessage}`,

              `Verified Bharat information:\n${business.answer}`,

              external
                ?.answer
                ? `External information:\n${external.answer}`
                : "",
            ]
              .filter(
                Boolean
              )
              .join(
                "\n\n"
              ),

            conversationMessages:
              [],

            systemInstruction:
              buildSynthesisPrompt({
                user:
                  requestingUser,
              }),
          });

        finalAnswer =
          synthesis.answer;

        usage =
          combineUsage(
            business.usage,

            external
              ?.usage,

            synthesis
              .usage
          );

        responseModel =
          synthesis.model ||
          model;
      }

      /* ===================================================
         FALLBACK
      =================================================== */

      else {
        const result =
          await generateSimpleResponse({
            provider,

            message:
              cleanMessage,

            conversationMessages:
              conversation
                .messages,

            systemInstruction:
              buildBharatAiSystemPrompt({
                user:
                  requestingUser,
              }),
          });

        finalAnswer =
          result.answer;

        usage =
          result.usage;

        responseModel =
          result.model;
      }

      /* ===================================================
         FINAL ANSWER VALIDATION
      =================================================== */

      if (
        !String(
          finalAnswer ||
            ""
        ).trim()
      ) {
        throw new Error(
          "Bharat Intelligence did not generate an answer."
        );
      }

      finalAnswer =
        String(
          finalAnswer
        ).trim();

      /* ===================================================
         CONTEXTUAL SUGGESTIONS
      =================================================== */

      if (
        !suggestions.length
      ) {
        suggestions =
          buildSuggestions({
            message:
              canonicalMessage,

            routeInfo,

            toolsUsed,

            documents,
          });
      }

      /* ===================================================
         CLEAR OLD PENDING CLARIFICATION
      =================================================== */

      conversationContext =
        mergeContext(
          conversationContext,
          {
            pendingClarification:
              null,

            pendingBaseMessage:
              null,
          }
        );

      /* ===================================================
         SAVE CONVERSATION
      =================================================== */

      await saveTurn({
        conversation,

        requestingUser,

        userMessage:
          cleanMessage,

        assistantMessage:
          finalAnswer,

        context:
          conversationContext,
      });

      const latencyMs =
        Date.now() -
        startedAt;

      /* ===================================================
         LOG SUCCESS
      =================================================== */

      logSuccess({
        requestingUser,

        conversationId:
          conversation
            .conversationId,

        question:
          cleanMessage,

        requestType,

        providerName:
          responseProvider,

        model:
          responseModel,

        toolsUsed,

        answer:
          finalAnswer,

        usage,

        latencyMs,
      });

      /* ===================================================
         RESPONSE
      =================================================== */

      return {
        answer:
          finalAnswer,

        conversationId:
          conversation
            .conversationId,

        requestType,

        route:
          routeInfo.route,

        resolvedPeriod:
          conversationContext
            .period
            ? {
                label:
                  conversationContext
                    .period
                    .label,

                dateFrom:
                  conversationContext
                    .period
                    .dateFrom,

                dateTo:
                  conversationContext
                    .period
                    .dateTo,
              }
            : null,

        clarification:
          null,

        suggestions,

        toolsUsed,

        sources,

        documents,

        usage: {
          inputTokens:
            Number(
              usage
                ?.inputTokens ||
                0
            ),

          outputTokens:
            Number(
              usage
                ?.outputTokens ||
                0
            ),

          totalTokens:
            Number(
              usage
                ?.totalTokens ||
                0
            ),
        },

        model:
          responseModel,

        provider:
          responseProvider,

        businessClock:
          getBusinessClockContext(),

        generatedAt:
          new Date(),
      };
    } catch (error) {
      /* ===================================================
         LOG FAILURE
      =================================================== */

      logFailure({
        requestingUser,

        conversationId:
          conversation
            ?.conversationId,

        question:
          cleanMessage,

        requestType,

        providerName:
          responseProvider,

        model:
          responseModel,

        toolsUsed,

        usage,

        latencyMs:
          Date.now() -
          startedAt,

        error,
      });

      throw error;
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  askBharatAi,
};