import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/telemetry/web-vitals/route";

describe("web vitals telemetry route", () => {
  it("ignores empty beacon bodies", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/telemetry/web-vitals",
      {
        method: "POST",
        body: "",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(204);
  });

  it("ignores malformed beacon payloads", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/telemetry/web-vitals",
      {
        method: "POST",
        body: "{",
        headers: {
          "content-type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(204);
  });

  it("records valid web vital payloads", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/telemetry/web-vitals",
      {
        method: "POST",
        body: JSON.stringify({
          id: "metric-1",
          name: "LCP",
          value: 1234,
          rating: "good",
          delta: 1234,
          navigationType: "navigate",
          pathname: "/",
        }),
        headers: {
          "content-type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(204);
  });
});
