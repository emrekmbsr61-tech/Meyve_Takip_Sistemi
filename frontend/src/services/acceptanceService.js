import { API_BASE_URL } from "../config/api";

export async function createAcceptance(payload) {
  const response = await fetch(`${API_BASE_URL}/acceptances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Mal kabul kaydedilemedi.");
  }

  return data;
}
