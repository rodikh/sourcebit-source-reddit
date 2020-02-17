module.exports = {
  plugins: [
    {
      module: require("/Users/rodik/Work/Stackbit/sourcebit-source-reddit"),
      options: {
        subredditName: "spacex"
      }
    },
    {
      module: require("sourcebit-target-jekyll"),
      options: {
        writeFile: function(entry, utils) {
          // This function is invoked for each entry and its return value determines
          // whether the entry will be written to a file. When an object with `content`,
          // `format` and `path` properties is returned, a file will be written with
          // those parameters. If a falsy value is returned, no file will be created.
          const { __metadata: meta, ...fields } = entry;

          if (!meta) return;

          const { createdAt = "", modelName, projectId, source } = meta;

          if (
            modelName === "reddit-post" &&
            projectId === "undefined" &&
            source === "sourcebit-source-reddit"
          ) {
            const { __metadata, ...fields } = entry;

            return {
              append: false,
              content: fields,
              format: "json",
              path: "_data/reddit-post.json"
            };
          }
        }
      }
    }
  ]
};
