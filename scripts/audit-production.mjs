import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const result=spawnSync(
  "npm",
  ["audit","--json","--omit=dev"],
  {
    cwd:process.cwd(),
    encoding:"utf8",
    maxBuffer:20*1024*1024
  }
);

if(!result.stdout){
  console.error(result.stderr||"npm audit returned no JSON output.");
  process.exit(1);
}

let report;
try{
  report=JSON.parse(result.stdout);
}catch(error){
  console.error("Could not parse npm audit JSON.");
  console.error(result.stdout.slice(-5000));
  throw error;
}

const vulnerabilities=report.vulnerabilities??{};
const installedCritical=[];

for(const [name,details] of Object.entries(vulnerabilities)){
  if(details?.severity!=="critical") continue;
  const packagePath=join(
    process.cwd(),
    "node_modules",
    ...name.split("/"),
    "package.json"
  );
  if(existsSync(packagePath)){
    installedCritical.push({
      name,
      via:details.via,
      range:details.range,
      fixAvailable:details.fixAvailable
    });
  }
}

if(installedCritical.length){
  console.error(
    JSON.stringify(
      {
        message:"Critical vulnerabilities are present in installed production dependencies.",
        vulnerabilities:installedCritical
      },
      null,
      2
    )
  );
  process.exit(1);
}

const reportedCritical=Object.entries(vulnerabilities)
  .filter(([,details])=>details?.severity==="critical")
  .map(([name])=>name);

console.log(
  JSON.stringify(
    {
      status:"ok",
      installedCritical:0,
      manifestCriticalNotInstalled:reportedCritical
    },
    null,
    2
  )
);
