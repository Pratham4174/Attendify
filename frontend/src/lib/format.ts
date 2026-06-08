export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleString();
}

export function formatTimeOnly(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function buildMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function formatWorkedHours(checkInTime: string | null | undefined, checkOutTime: string | null | undefined) {
  if (!checkInTime || !checkOutTime) {
    return "In progress";
  }

  const checkIn = new Date(checkInTime).getTime();
  const checkOut = new Date(checkOutTime).getTime();
  const diffMs = checkOut - checkIn;

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return "Unavailable";
  }

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export function formatMoney(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
      }).format(amount)
    : "INR 0.00";
}

export function getDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(latitudeB - latitudeA);
  const lonDiff = toRadians(longitudeB - longitudeA);
  const startLat = toRadians(latitudeA);
  const endLat = toRadians(latitudeB);

  const haversine =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDiff / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function isLateCheckIn(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return totalMinutes > 9 * 60 + 15;
}
