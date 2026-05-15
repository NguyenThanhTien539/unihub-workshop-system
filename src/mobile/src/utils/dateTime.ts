const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function isValidDateText(value: string) {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidTimeText(value: string) {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) {
    return false;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function toLocalDateTime(dateText: string, timeText: string) {
  const date = dateText.trim();
  const time = timeText.trim();

  if (!isValidDateText(date)) {
    throw new Error("Enter date as YYYY-MM-DD.");
  }
  if (!isValidTimeText(time)) {
    throw new Error("Enter time as HH:mm.");
  }

  return `${date}T${time}:00`;
}

export function compareDateTimes(
  leftDate: string,
  leftTime: string,
  rightDate: string,
  rightTime: string,
) {
  const left = new Date(toLocalDateTime(leftDate, leftTime)).getTime();
  const right = new Date(toLocalDateTime(rightDate, rightTime)).getTime();
  return left - right;
}

export function formatDateInput(value?: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeInput(value?: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
