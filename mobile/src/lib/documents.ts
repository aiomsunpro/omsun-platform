import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";
import { DOCUMENTS_BUCKET } from "./config";
import { errorText, supabase } from "./supabase";

/** A file chosen on the phone, not yet uploaded. */
export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  /** Web only: the browser File object. */
  file?: Blob;
};

export type PickSource = "camera" | "gallery" | "file";

export async function pickFile(source: PickSource): Promise<PickedFile | null> {
  if (source === "file") {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? guessMime(a.name), size: a.size, file: a.file };
  }

  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6 };
  const res =
    source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const name = a.fileName ?? `photo-${Date.now()}.jpg`;
  return { uri: a.uri, name, mimeType: a.mimeType ?? guessMime(name), size: a.fileSize, file: a.file };
}

function guessMime(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function safeName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-80) || "document";
}

/**
 * Uploads one file for a request and records it. The storage path must start
 * with the request id; the database checks the retailer owns that request.
 */
export async function uploadRequestDocument(
  requestId: string,
  picked: PickedFile,
  documentName: string,
  requiredDocumentId: string | null,
): Promise<void> {
  const path = `${requestId}/${Date.now()}-${safeName(picked.name)}`;
  const body = picked.file ?? (await (await fetch(picked.uri)).arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, body, { contentType: picked.mimeType, upsert: false });
  if (upErr) throw new Error(errorText(upErr));

  const { error } = await supabase.from("request_documents").insert({
    request_id: requestId,
    required_document_id: requiredDocumentId,
    document_name: documentName,
    storage_path: path,
    mime_type: picked.mimeType,
    size_bytes: picked.size ?? null,
  });
  if (error) throw new Error(errorText(error));
}

/** Opens a stored document through a short-lived signed link. */
export async function openDocument(storagePath: string) {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data) throw new Error(errorText(error));
  await Linking.openURL(data.signedUrl);
}

/** Yes/no question that also works in the browser preview. */
export function confirm(title: string, message: string, yes: string, no: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: no, style: "cancel", onPress: () => resolve(false) },
      { text: yes, onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
