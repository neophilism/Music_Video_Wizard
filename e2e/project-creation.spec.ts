import { expect,test } from "@playwright/test";

function silentWav(durationMs=250,sampleRate=8000){
  const samples=Math.max(1,Math.floor(sampleRate*durationMs/1000));
  const dataSize=samples*2;
  const buffer=Buffer.alloc(44+dataSize);
  buffer.write("RIFF",0,"ascii");
  buffer.writeUInt32LE(36+dataSize,4);
  buffer.write("WAVE",8,"ascii");
  buffer.write("fmt ",12,"ascii");
  buffer.writeUInt32LE(16,16);
  buffer.writeUInt16LE(1,20);
  buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(sampleRate,24);
  buffer.writeUInt32LE(sampleRate*2,28);
  buffer.writeUInt16LE(2,32);
  buffer.writeUInt16LE(16,34);
  buffer.write("data",36,"ascii");
  buffer.writeUInt32LE(dataSize,40);
  return buffer;
}

test("new user can create a project and enter the wizard",async({page})=>{
  const marker=Date.now()+"-"+Math.random().toString(16).slice(2);
  const email="browser-e2e-"+marker+"@example.test";

  await page.goto("/sign-up");

  await page.getByLabel("Name").fill("Browser E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Browser-E2E-Password-2026!");
  await page.getByRole("button",{name:"Create account"}).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading",{name:"Your studio"})
  ).toBeVisible();

  const firstProjectLink=page.getByRole("link",{
    name:/New project|Create first project/
  }).first();
  await firstProjectLink.click();

  await expect(
    page.getByRole("heading",{name:"Start with the finished song."})
  ).toBeVisible();

  await page.getByLabel("Project title").fill("Browser E2E Project");
  await page.getByLabel("Description").fill(
    "Deterministic browser acceptance project."
  );
  await page.getByLabel("Aspect ratio").selectOption("16:9");
  await page.getByLabel("Frame rate").selectOption("24");
  await page.getByLabel("Finished music").setInputFiles({
    name:"browser-e2e.wav",
    mimeType:"audio/wav",
    buffer:silentWav()
  });

  await page.getByRole("button",{name:"Create project"}).click();

  await expect(page).toHaveURL(/\/app\/projects\/[^/]+\/wizard/);
  await expect(
    page.getByRole("heading",{name:"Project setup"})
  ).toBeVisible();
  await expect(page.getByText("browser-e2e.wav")).toBeVisible();
  await expect(page.getByText(/Project version 1/)).toBeVisible();
});
