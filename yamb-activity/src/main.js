import { DiscordSDK } from "@discord/embedded-app-sdk";

const app = document.getElementById("app");

const APPLICATION_ID = "1471258000097284239";

let discordSdk;

async function init() {
  try {
    app.innerHTML = "<h1>Initializing Discord SDK...</h1>";

    discordSdk = new DiscordSDK(APPLICATION_ID);

    await discordSdk.ready();

    const user = await discordSdk.commands.getUser();

    app.innerHTML = `
      <h1>SDK READY ✅</h1>
      <p>Logged in as: ${user.username}</p>
      <p>User ID: ${user.id}</p>
    `;

  } catch (err) {
    console.error(err);
    app.innerHTML = "<h1>SDK FAILED ❌</h1>";
  }
}

init();
