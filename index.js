const snoowrap = require("snoowrap");
const axios = require("axios");
const pkg = require("./package.json");

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                           *
 *  📌 name (String)                                         *
 *     ====                                                  *
 *                                                           *
 *  The name of the plugin. Typically, this value is the     *
 *  same as the `name` field from `package.json`.            *
 *                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
module.exports.name = pkg.name;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                           *
 *  📌 options (Object)                                      *
 *     =======                                               *
 *                                                           *
 *  The options expected by the plugin, as an object. Each   *
 *  key represents an option. The values are objects with    *
 *  one or more of the following keys:                       *
 *                                                           *
 *  - `default` (Any): The value to be used for this option  *
 *    in case one hasn't been supplied.                      *
 *  - `env` (String): The name of an environment variable    *
 *    to read the value from.                                *
 *  - `private` (Boolean): Whether this option represents    *
 *    sensitive information and therefore should be stored   *
 *    in a `.env` file, rather than the main configuration   *
 *    file.                                                  *
 *  - `runtimeParameter` (String): The name of a runtime     *
 *    parameter (e.g. CLI parameter) to read the value from. *
 *    When present, the value of the parameter overrides any *
 *    value defined in the configuration file.               *
 *                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
module.exports.options = {
  subredditName: {}
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                           *
 *  📌 bootstrap (Function)                                  *
 *     =========                                             *
 *                                                           *
 *  A function to be executed once when the plugin starts.   *
 *  It receives an object with the following properties:     *
 *                                                           *
 *  - `debug` (Function): A method for printing data that    *
 *    might be useful to see when debugging the plugin.      *
 *    Data sent to this method will be hidden from the user  *
 *    unless the application is in debug mode.               *
 *  - `getPluginContext` (Function): A function for getting  *
 *    the plugin's context object.                           *
 *  - `log` (Function): A method for logging a message. It   *
 *    adds a prefix with the name of the plugin that created *
 *    it, and respects the verbosity settings specified by   *
 *    the user.                                              *
 *  - `options` (Object): The plugin options object, as they *
 *    come from the main configuration file, `.env` files    *
 *    and runtime parameters.                                *
 *  - `refresh` (Function): A function to be called whenever *
 *    there are changes in the data managed by the plugin,   *
 *    forcing the entire plugin chain to be re-executed.     *
 *  - `setPluginContext` (Function): A function for setting  *
 *    the plugin's context object                            *
 *                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
module.exports.bootstrap = async ({
  debug,
  getPluginContext,
  log,
  options,
  refresh,
  setPluginContext
}) => {
  // 👉 Get the plugin's context object. This is useful for the
  // plugin to share any data between its various methods during
  // its runtime lifecycle.
  // Additionally, it leverages Sourcebit's caching layer, which
  // means that whatever a plugin stores in its context will be
  // persisted to disk and loaded automatically on the next run.
  const context = getPluginContext();

  // 👉 If there are entries in the cache, there's nothing that
  // needs to be done right now.
  if (context && context.entries) {
    log(`Loaded ${context.entries.length} entries from cache`);
  } else {
    const { data } = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      "grant_type=https://oauth.reddit.com/grants/installed_client&device_id=sourcebit-source-reddit",
      {
        headers: {
          Authorization:
            "Basic aFJ0TDBPMkEzU2gzNXc6XzBIVUtjLXVNS0Fuc0w0R1FyWVNqTWFIdGpN"
        }
      }
    );

    const r = new snoowrap({
      userAgent: "sourcebit-source-reddit",
      accessToken: data.access_token
    });

    const entries = await r.getHot(options.subredditName);

    log(`Loaded ${entries.length} entries`);
    debug("Initial entries: %O", entries);

    // 👉 Adding the newly-generated entries to the plugin's
    // context object.
    setPluginContext({
      entries
    });
  }
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                           *
 *  📌 transform (Function)                                  *
 *     =========                                             *
 *                                                           *
 *  A function to be executed once when the plugin starts    *
 *  and whenever one of the plugins triggers an update       *
 *  (i.e. by calling `refresh()` inside `bootstrap()`).      *
 *  Its purpose is to receive and transform an object that   *
 *  contains data buckets, which are arrays of entries.      *
 *  Therefore, the return value of this method must be a     *
 *  new data object.                                         *
 *  Please note that in the first execution, `transform`     *
 *  always runs after `bootstrap()`.                         *
 *  It receives an object with the following properties:     *
 *                                                           *
 *  - `data` (Object): The input data object, containing     *
 *    data buckets.                                          *
 *  - `debug` (Function): A method for printing data that    *
 *    might be useful to see when debugging the plugin.      *
 *    Data sent to this method will be hidden from the user  *
 *    unless the application is in debug mode.               *
 *  - `getPluginContext` (Function): A function for getting  *
 *    the plugin's context object.                           *
 *  - `log` (Function): An alias for `console.log` that adds *
 *    to the message information about the plugin it comes   *
 *    from.                                                  *
 *  - `options` (Object): The plugin options object, as they *
 *    come from the main configuration file, `.env` files    *
 *    and runtime parameters.                                *
 *                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
module.exports.transform = ({
  data,
  debug,
  getPluginContext,
  log,
  options
}) => {
  // 👉 Let's retrieve from the plugin's context object the
  // entries that we've created in the bootstrap method.
  const { entries } = getPluginContext();

  // Source plugins are encouraged to add information about their
  // models to the `models` data bucket.
  const model = {
    source: pkg.name,
    modelName: "reddit-post",
    modelLabel: "Reddit Post",
    fieldNames: ["title", "url", "subreddit"]
  };

  // 👉 The main purpose of this method is to normalize the
  // entries, so that they conform to a standardized format
  // used by all source plugins.
  const normalizedEntries = entries.map(entry => {
    const title = options.titleCase
      ? entry.title
          .split(" ")
          .map(word => word[0].toUpperCase() + word.substring(1))
          .join(" ")
      : entry.title;

    return {
      title,
      url: entry.url,
      subreddit: entry.subreddit,
      __metadata: model
    };
  });

  // 👉 The method must return the updated data object, which
  // in our case means appending our entries to the `objects`
  // property.
  return {
    ...data,
    models: data.models.concat(model),
    objects: data.objects.concat(normalizedEntries)
  };
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                           *
 *  📌 getSetup (Function)                                   *
 *     ========                                              *
 *                                                           *
 *  A function to be executed as part of the interactive     *
 *  setup process for this plugin.                           *
 *  It receives an object with the following properties:     *
 *                                                           *
 *  - `chalk` (Function): An instance of the `chalk` npm     *
 *    module (https://www.npmjs.com/package/chalk), used in  *
 *    the command-line interface for styling text.           *
 *  - `context` (Object): The global context object, shared  *
 *    by all plugins.                                        *
 *  - `currentOptions` (Object): The options for this plugin *
 *    present in an existing configuration file, if found.   *
 *  - `data` (Object): The data object populated by all      *
 *    previous plugins.                                      *
 *    data buckets.                                          *
 *  - `debug` (Function): A method for printing data that    *
 *    might be useful to see when debugging the plugin.      *
 *    Data sent to this method will be hidden from the user  *
 *    unless the application is in debug mode.               *
 *  - `getSetupContext` (Function): A function for getting   *
 *    the context object that is shared between all the      *
 *    plugins during the setup process.                      *
 *  - `inquirer` (Function): An instance of the `inquirer`   *
 *    npm module (https://www.npmjs.com/package/inquirer),   *
 *    used in the command-line interface to prompt questions *
 *    to the user.                                           *
 *  - `ora` (Function): An instance of the `ora` npm module  *
 *    (https://www.npmjs.com/package/ora), used in the       *
 *    command-line interface to display information and      *
 *    error messages, as well as loading states.             *
 *  - `setSetupContext` (Function): A function for setting   *
 *    the context object that is shared between all the      *
 *    plugins during the setup process.                      *
 *                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
module.exports.getSetup = ({
  chalk,
  context,
  currentOptions,
  data,
  debug,
  getSetupContext,
  inquirer,
  ora,
  setSetupContext
}) => {
  const questions = [
    {
      type: "input",
      name: "subredditName",
      message: `Subreddit:`
    }
  ];

  // 👉 For simple setup processes, this method can simply return
  // an array of questions in the format expected by `inquirer`.
  // Alternatively, it can run its own setup instance, display
  // messages, make external calls, etc. For this, it should return
  // a function which, when executed, must return a Promise with
  // an answers object.
  return async () => {
    const answers = await inquirer.prompt(questions);
    return answers;
  };
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                           *
 *  📌 getOptionsFromSetup (Function)                        *
 *     ===================                                   *
 *                                                           *
 *  A function to be executed after the interactive has      *
 *  finished.                                                *
 *  It receives an object with the following properties:     *
 *                                                           *
 *  - `answers` (Object): The answers generated during the   *
 *    interactive setup process.                             *
 *    data buckets.                                          *
 *  - `debug` (Function): A method for printing data that    *
 *    might be useful to see when debugging the plugin.      *
 *    Data sent to this method will be hidden from the user  *
 *    unless the application is in debug mode.               *
 *  - `getSetupContext` (Function): A function for getting   *
 *    the context object that is shared between all the      *
 *    plugins during the setup process.                      *
 *  - `setSetupContext` (Function): A function for setting   *
 *    the context object that is shared between all the      *
 *    plugins during the setup process.                      *
 *                                                           *
 *  The return value of this function must be the object     *
 *  that is to be set as the `options` block of the plugin   *
 *  configuration in `sourcebit.js`.                         *
 *                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
module.exports.getOptionsFromSetup = ({
  answers,
  debug,
  getSetupContext,
  setSetupContext
}) => {
  // 👉 This is a good place to make some transformation to the
  // values generated in the setup process before they're added
  // to the configuration file.
  return {
    subredditName: answers.subredditName
  };
};
