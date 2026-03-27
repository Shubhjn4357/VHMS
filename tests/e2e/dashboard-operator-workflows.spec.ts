import { expect, test, type Locator, type Page } from "@playwright/test";

import { authenticatePageAs } from "./auth-session";

test.describe.configure({ mode: "serial", timeout: 360_000 });

type WorkflowState = {
  doctorLabel?: string;
  patientFullName: string;
};

type SelectOption = {
  disabled: boolean;
  text: string;
  value: string;
};

const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1_000)}`;
const patientFirstName = `E2E${uniqueSuffix}`;
const patientLastName = "Workflow";
const workflow: WorkflowState = {
  patientFullName: `${patientFirstName} ${patientLastName}`.trim(),
};
const createdPatientPhone = `+91-982${uniqueSuffix.replace(/\D/g, "").slice(-7)}`;
const updatedPatientPhone = `+91-981${uniqueSuffix.replace(/\D/g, "").slice(-7)}`;
const appointmentInitialNote = `Initial reception workflow ${uniqueSuffix}`;
const appointmentUpdatedNote = `Updated reception workflow ${uniqueSuffix}`;

function formatLocalDateTime(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function readSelectOptions(select: Locator) {
  return await select.locator("option").evaluateAll<SelectOption[]>((elements) =>
    elements.map((element) => {
      const option = element as HTMLOptionElement;
      return {
        disabled: option.disabled,
        text: option.textContent?.trim() ?? "",
        value: option.value,
      };
    })
  );
}

async function readSelectValue(select: Locator) {
  return await select.evaluate((element) =>
    (element as HTMLSelectElement).value
  );
}

function nativeSelect(scope: Locator | Page, name: string) {
  return scope.locator(`select[name="${name}"]`);
}

async function selectFirstRealOption(select: Locator) {
  let pickedOption: SelectOption | undefined;

  await expect.poll(async () => {
    const options = await readSelectOptions(select);
    pickedOption = options.find((option) => option.value && !option.disabled);
    return pickedOption?.value ?? "";
  }, { timeout: 120_000 }).not.toBe("");

  if (!pickedOption) {
    throw new Error("No selectable option was available.");
  }

  await select.selectOption(pickedOption.value);
  return pickedOption;
}

async function selectOptionContainingText(select: Locator, text: string) {
  let pickedOption: SelectOption | undefined;

  await expect.poll(async () => {
    const options = await readSelectOptions(select);
    pickedOption = options.find((option) =>
      option.value &&
      !option.disabled &&
      option.text.includes(text)
    );
    return pickedOption?.value ?? "";
  }, { timeout: 120_000 }).not.toBe("");

  if (!pickedOption) {
    throw new Error(`No selectable option matched "${text}".`);
  }

  await select.selectOption(pickedOption.value);
  return pickedOption;
}

async function expectSelectValue(select: Locator, expectedValue: string) {
  await expect.poll(async () => await readSelectValue(select), {
    timeout: 120_000,
  }).toBe(expectedValue);
}

async function expectSelectToBeFilled(select: Locator) {
  await expect.poll(async () => await readSelectValue(select), {
    timeout: 120_000,
  }).not.toBe("");
}

function patientNameFromSourceAppointmentOption(optionText: string) {
  return optionText
    .split(" - ")
    .slice(1)
    .join(" - ")
    .split(" / ")[0]
    .trim();
}

async function selectAdmissionEligibleSourceAppointment(
  sourceAppointmentSelect: Locator,
  patientSelect: Locator,
) {
  let pickedOption: SelectOption | undefined;

  await expect.poll(async () => {
    const sourceOptions = await readSelectOptions(sourceAppointmentSelect);
    const patientOptions = await readSelectOptions(patientSelect);
    pickedOption = sourceOptions.find((option) => {
      if (!option.value || option.disabled) {
        return false;
      }

      const patientName = patientNameFromSourceAppointmentOption(option.text);
      return patientOptions.some((patientOption) =>
        patientOption.value &&
        !patientOption.disabled &&
        patientOption.text.includes(patientName)
      );
    });

    return pickedOption?.value ?? "";
  }, { timeout: 120_000 }).not.toBe("");

  if (!pickedOption) {
    throw new Error("No admission-eligible source appointment was available.");
  }

  await sourceAppointmentSelect.selectOption(pickedOption.value);
  return pickedOption;
}

async function discardSavedDraftIfPresent(page: Page) {
  const discardButton = page.getByRole("button", {
    name: "Discard draft",
    exact: true,
  });

  if (await discardButton.count()) {
    await discardButton.first().click();
    await expect(discardButton).toHaveCount(0);
  }
}

function recordShell(page: Page, text: string) {
  return page.locator("article", { hasText: text }).first();
}

async function expectDashboardHeading(page: Page, heading: string) {
  await expect(
    page.getByRole("heading", { level: 1, name: new RegExp(`^${heading}$`, "i") }),
  ).toBeVisible({ timeout: 30_000 });
}

test("admin can register and update a patient record", async ({ page }) => {
  await authenticatePageAs(page, "ADMIN");
  await page.goto("/dashboard/patients/new", { waitUntil: "domcontentloaded" });
  await expectDashboardHeading(page, "Register patient");

  const patientForm = page.locator("#patient-management-form");
  await expect(patientForm).toBeVisible({ timeout: 30_000 });
  await discardSavedDraftIfPresent(page);

  await patientForm.getByLabel("First name", { exact: true }).fill(patientFirstName);
  await patientForm.getByLabel("Last name", { exact: true }).fill(patientLastName);
  await patientForm.getByLabel("Phone", { exact: true }).fill(createdPatientPhone);
  await patientForm.getByLabel("City", { exact: true }).fill("Jaipur");
  await patientForm.getByLabel("State", { exact: true }).fill("Rajasthan");

  await patientForm.evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(patientForm).not.toBeVisible({ timeout: 30_000 });

  await page.goto("/dashboard/patients", { waitUntil: "domcontentloaded" });
  await expectDashboardHeading(page, "Patients");

  const patientSearch = page.getByPlaceholder("Search hospital number, name, phone");
  await patientSearch.fill(workflow.patientFullName);

  const patientCard = recordShell(page, workflow.patientFullName);
  await expect(patientCard).toBeVisible({ timeout: 30_000 });
  await expect(patientCard).toContainText(createdPatientPhone);

  await patientCard.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(patientForm).toBeVisible({ timeout: 30_000 });

  await patientForm.getByLabel("Phone", { exact: true }).fill(updatedPatientPhone);
  await patientForm.getByLabel("City", { exact: true }).fill("Kolkata");
  await patientForm.getByLabel("State", { exact: true }).fill("West Bengal");

  await patientForm.evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(patientForm).not.toBeVisible({ timeout: 30_000 });
  await expect(patientCard).toContainText(updatedPatientPhone);
  await expect(patientCard).toContainText("Kolkata, West Bengal");
});

test("admin can schedule, edit, and check in an appointment", async ({
  page,
}) => {
  await authenticatePageAs(page, "ADMIN");
  await page.goto("/dashboard/appointments/new", {
    waitUntil: "domcontentloaded",
  });
  await expectDashboardHeading(page, "Schedule appointment");

  const appointmentForm = page.locator("#appointment-management-form");
  await expect(appointmentForm).toBeVisible({ timeout: 30_000 });
  await discardSavedDraftIfPresent(page);

  const pickedPatient = await selectOptionContainingText(
    nativeSelect(appointmentForm, "patientId"),
    patientLastName,
  );
  workflow.patientFullName = pickedPatient.text.split(" - ").slice(1).join(" - ");
  const pickedDoctor = await selectFirstRealOption(
    nativeSelect(appointmentForm, "doctorId"),
  );
  workflow.doctorLabel = pickedDoctor.text;

  await appointmentForm.getByLabel("Scheduled for", { exact: true }).fill(
    formatLocalDateTime(new Date(Date.now() + 3 * 60 * 60 * 1_000)),
  );
  await appointmentForm.getByLabel("Notes", { exact: true }).fill(appointmentInitialNote);

  await appointmentForm.evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(appointmentForm).not.toBeVisible({ timeout: 30_000 });

  await page.goto("/dashboard/appointments", { waitUntil: "domcontentloaded" });
  await expectDashboardHeading(page, "Appointments");

  const appointmentSearch = page.getByPlaceholder("Search patient, doctor, UHID");
  await appointmentSearch.fill(workflow.patientFullName);

  const appointmentCard = recordShell(page, workflow.patientFullName);
  await expect(appointmentCard).toBeVisible({ timeout: 30_000 });
  await expect(appointmentCard).toContainText(appointmentInitialNote);

  await appointmentCard.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(appointmentForm).toBeVisible({ timeout: 30_000 });

  await nativeSelect(appointmentForm, "status").selectOption("CONFIRMED");
  await appointmentForm.getByLabel("Notes", { exact: true }).fill(appointmentUpdatedNote);

  await appointmentForm.evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(appointmentForm).not.toBeVisible({ timeout: 30_000 });
  await expect(appointmentCard).toContainText("CONFIRMED");
  await expect(appointmentCard).toContainText(appointmentUpdatedNote);

  await appointmentCard.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(appointmentCard).toContainText("CHECKED IN", { timeout: 30_000 });
});

test("admin can create and settle a draft bill from the appointment", async ({
  page,
}) => {
  await authenticatePageAs(page, "ADMIN");
  await page.goto("/dashboard/billing/create", { waitUntil: "domcontentloaded" });
  await expectDashboardHeading(page, "Create invoice and draft bill");
  await discardSavedDraftIfPresent(page);

  const appointmentSelect = nativeSelect(page, "appointmentId");
  await selectOptionContainingText(appointmentSelect, workflow.patientFullName);
  await expect(page.getByText(workflow.patientFullName, { exact: true })).toBeVisible();

  await expect(page.getByText("Charge catalog", { exact: true })).toBeVisible();
  const addChargeButtons = page.getByRole("button", { name: "Add", exact: true });
  if (await addChargeButtons.count()) {
    await addChargeButtons.first().click();
    await expect(page.getByText("Added x1", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText("Charge master linked", { exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  await page.getByRole("button", { name: "Create draft bill", exact: true }).click();

  await page.goto("/dashboard/billing/checkout", { waitUntil: "domcontentloaded" });
  await expectDashboardHeading(page, "Billing checkout desk");

  const billSearch = page.getByPlaceholder("Search bill, patient, UHID");
  await billSearch.fill(workflow.patientFullName);

  const billCard = recordShell(page, workflow.patientFullName);
  await expect(billCard).toBeVisible({ timeout: 30_000 });
  await expect(billCard).toContainText("DRAFT");

  await billCard.getByRole("button", { name: "Settle bill", exact: true }).click();
  await page.getByRole("button", { name: "Record settlement", exact: true }).click();

  await expect(billCard).toContainText("PAID", { timeout: 30_000 });
});

test("admin can admit the appointment patient to a bed and discharge them", async ({
  page,
}) => {
  await authenticatePageAs(page, "ADMIN");
  await page.goto("/dashboard/occupancy", { waitUntil: "domcontentloaded" });
  await expectDashboardHeading(page, "Occupancy");

  await page.getByRole("button", { name: "Admit Patient", exact: true }).click();

  const occupancyForm = page.locator("#occupancy-assignment-form");
  await expect(occupancyForm).toBeVisible({ timeout: 30_000 });

  const sourceAppointmentSelect = occupancyForm.locator("select").first();
  const patientSelect = nativeSelect(occupancyForm, "patientId");
  const sourceOption = await selectAdmissionEligibleSourceAppointment(
    sourceAppointmentSelect,
    patientSelect,
  );
  workflow.patientFullName = patientNameFromSourceAppointmentOption(sourceOption.text);
  await expectSelectValue(sourceAppointmentSelect, sourceOption.value);
  await expectSelectToBeFilled(patientSelect);
  await expectSelectToBeFilled(
    nativeSelect(occupancyForm, "attendingDoctorId"),
  );
  await selectFirstRealOption(nativeSelect(occupancyForm, "bedId"));

  await occupancyForm.evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(occupancyForm).not.toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", {
      level: 3,
      name: workflow.patientFullName,
      exact: true,
    }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Discharge", exact: true }).click();
  await expect(page.getByText("No active admission", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
});
