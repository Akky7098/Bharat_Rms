const Document =
  require(
    "../../../model/documentModel"
  );

const {
  isManagement,
} = require(
  "../security/aiAccess"
);

/* =========================================================
   ACCESS FILTER
========================================================= */

const buildAccessFilter =
  (
    requestingUser
  ) => {
    if (
      isManagement(
        requestingUser
      )
    ) {
      return {
        $or: [
          {
            accessLevel:
              "all_users",
          },

          {
            accessLevel:
              "admin_only",
          },

          {
            accessLevel:
              "private",

            "uploadedBy.userId":
              requestingUser._id,
          },
        ],
      };
    }

    return {
      $or: [
        {
          accessLevel:
            "all_users",
        },

        {
          accessLevel:
            "private",

          "uploadedBy.userId":
            requestingUser._id,
        },
      ],
    };
  };

/* =========================================================
   SEARCH
========================================================= */

const searchDocuments =
  async ({
    requestingUser,
    search,
    limit = 10,
  }) => {
    const escaped =
      String(
        search || ""
      )
        .trim()
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

    if (
      !escaped
    ) {
      return {
        count:
          0,

        documents:
          [],
      };
    }

    const documents =
      await Document.find({
        isActive:
          true,

        $and: [
          buildAccessFilter(
            requestingUser
          ),

          {
            $or: [
              {
                title: {
                  $regex:
                    escaped,

                  $options:
                    "i",
                },
              },

              {
                description: {
                  $regex:
                    escaped,

                  $options:
                    "i",
                },
              },

              {
                originalFileName:
                  {
                    $regex:
                      escaped,

                    $options:
                      "i",
                  },
              },
            ],
          },
        ],
      })
        .select(
          [
            "_id",
            "title",
            "description",
            "originalFileName",
            "fileUrl",
            "mimeType",
            "fileSize",
            "updatedAt",
          ].join(" ")
        )
        .sort({
          updatedAt:
            -1,
        })
        .limit(
          Math.min(
            Number(
              limit
            ) ||
              10,

            25
          )
        )
        .lean();

    return {
      count:
        documents.length,

      documents:
        documents.map(
          (
            document
          ) => ({
            id:
              document._id,

            title:
              document.title,

            description:
              document.description,

            originalFileName:
              document.originalFileName,

            fileUrl:
              document.fileUrl,

            mimeType:
              document.mimeType,

            fileSize:
              document.fileSize,
          })
        ),
    };
  };

module.exports = {
  searchDocuments,
};