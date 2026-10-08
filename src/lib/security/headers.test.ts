import { describe,expect,it } from "vitest";
import nextConfig,{ securityHeaders } from "../../../next.config";

describe("HTTP security headers",()=>{
  it("sets the release security baseline globally",async()=>{
    const map=new Map(securityHeaders.map(header=>[header.key,header.value]));

    expect(map.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(map.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(map.get("X-Frame-Options")).toBe("DENY");
    expect(map.get("X-Content-Type-Options")).toBe("nosniff");
    expect(map.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(map.get("Permissions-Policy")).toContain("camera=()");
    expect(map.get("Permissions-Policy")).toContain("microphone=()");
    expect(map.get("Cross-Origin-Opener-Policy")).toBe("same-origin");

    expect(nextConfig.headers).toBeTypeOf("function");
    const routes=await nextConfig.headers!();
    expect(routes).toHaveLength(1);
    expect(routes[0]?.source).toBe("/:path*");
  });

  it("does not grant browser media-device permissions globally",()=>{
    const permissions=securityHeaders.find(
      header=>header.key==="Permissions-Policy"
    )?.value;
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");
    expect(permissions).toContain("geolocation=()");
  });
});
