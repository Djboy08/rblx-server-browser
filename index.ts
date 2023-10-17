// Denotes the type for a server listing object
type ServerListing = {
  region: string;
  playerCount: number;
};

type ServerListings = {
  [key: string]: ServerListing;
};

let serverListings: ServerListings = {};

let cache: string;
let cacheTime = 0;
const server = Bun.serve({
  port: 80,
  async fetch(request) {
    if (request.headers.get("x-api-key") !== Bun.env.API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    if (url.pathname === "/") {
      // Check if cache is stale
      if (cacheTime < Date.now() - 1000 * 25) {
        cache = JSON.stringify(
          Object.entries(serverListings).map(([jobid, listing]) => ({
            jobid,
            ...listing,
          }))
        );
        cacheTime = Date.now();
      }

      return new Response(cache);
    }

    if (url.pathname === "/update") {
      const body = await request.json();
      serverListings[body.jobid] = {
        region: body.region,
        playerCount: body.playerCount,
      };
      if (body.jobid in serverListings) {
        return new Response("Updated");
      } else {
        return new Response("Failed to update");
      }
    }

    if (url.pathname === "/close") {
      const body = await request.json();
      delete serverListings[body.jobid];
      if (body.jobid in serverListings === false) {
        return new Response("Closed");
      } else {
        return new Response("Failed to close");
      }
    }

    return new Response("Unknown Path", { status: 404 });
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});

console.log(`Listening on localhost:${server.port}`);
