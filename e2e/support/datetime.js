const padNumber = (value) => String(value).padStart(2, "0");

const fillDateTimeGroup = async (fieldGroup, date) => {
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const year = String(date.getFullYear());
  const minutes = padNumber(date.getMinutes());
  const hours24 = date.getHours();
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = padNumber(hours24 % 12 || 12);

  await fieldGroup.getByRole("spinbutton", { name: "Month" }).fill(month);
  await fieldGroup.getByRole("spinbutton", { name: "Day" }).fill(day);
  await fieldGroup.getByRole("spinbutton", { name: "Year" }).fill(year);
  await fieldGroup.getByRole("spinbutton", { name: "Hours" }).fill(hours12);
  await fieldGroup.getByRole("spinbutton", { name: "Minutes" }).fill(minutes);
  await fieldGroup.getByRole("spinbutton", { name: "Meridiem" }).fill(meridiem);
  await fieldGroup.getByRole("spinbutton", { name: "Meridiem" }).press("Tab");
};

const fillDateTimeField = async (page, label, date) => {
  const fieldGroup = page.getByRole("group", {
    name: label,
    exact: typeof label === "string"
  });

  await fillDateTimeGroup(fieldGroup, date);
};

module.exports = {
  fillDateTimeField,
  fillDateTimeGroup
};
