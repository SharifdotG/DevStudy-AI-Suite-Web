"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: "Display name must be at least 2 characters." })
    .max(60, { message: "Display name must be 60 characters or less." }),
});

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit to keep uploads lightweight
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

function extractStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return parsed.pathname.slice(index + marker.length);
  } catch (error) {
    console.error("Failed to parse avatar URL", { url, error });
    return null;
  }
}

export type ProfileActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function updateProfile(prevState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const supabase = getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const displayName = parsed.data.displayName.trim();
  if (displayName.length < 2) {
    return { status: "error", message: "Display name must be at least 2 characters." };
  }
  const removeAvatar = formData.get("removeAvatar") === "true";
  const avatarFile = formData.get("avatarFile");

  const { data: currentProfileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  const currentProfileRecord = (currentProfileData as Record<string, unknown> | null) ?? null;
  const previousAvatarUrl = (currentProfileRecord?.avatar_url as string | null | undefined) ?? null;

  let nextAvatarUrl: string | null | undefined = undefined;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
      return { status: "error", message: "Avatar must be 2MB or less." };
    }

    if (!ACCEPTED_AVATAR_TYPES.includes(avatarFile.type as (typeof ACCEPTED_AVATAR_TYPES)[number])) {
      return { status: "error", message: "Upload a PNG, JPEG, AVIF, or WebP image." };
    }

    const fileExtension =
      avatarFile.name.split(".").pop()?.toLowerCase() || avatarFile.type.split("/").pop() || "png";
    const storagePath = `${session.user.id}/${crypto.randomUUID()}.${fileExtension}`;

    const arrayBuffer = await avatarFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("bucket")) {
        return {
          status: "error",
          message: "Avatar storage bucket 'avatars' is missing. Create it in Supabase Storage before uploading.",
        };
      }

      return { status: "error", message: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);

    if (!publicUrlData?.publicUrl) {
      return { status: "error", message: "Could not retrieve avatar URL." };
    }

    nextAvatarUrl = publicUrlData.publicUrl;

    const previousPath = extractStoragePathFromUrl(previousAvatarUrl);
    if (previousPath) {
      const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      if (removeError) {
        console.error("Failed to remove previous avatar", removeError);
      }
    }
  } else if (removeAvatar) {
    nextAvatarUrl = null;

    const previousPath = extractStoragePathFromUrl(previousAvatarUrl);
    if (previousPath) {
      const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      if (removeError) {
        console.error("Failed to remove previous avatar", removeError);
      }
    }
  }

  const profileBaseUpdate: Record<string, unknown> = { id: session.user.id };
  if (nextAvatarUrl !== undefined) {
    profileBaseUpdate.avatar_url = nextAvatarUrl;
  }

  const supportedColumns: ("display_name" | "full_name")[] = [];

  if (currentProfileRecord) {
    if ("display_name" in currentProfileRecord) {
      supportedColumns.push("display_name");
    }
    if ("full_name" in currentProfileRecord) {
      supportedColumns.push("full_name");
    }
  }

  if (supportedColumns.length === 0) {
    supportedColumns.push("display_name", "full_name");
  }

  let upserted = false;
  for (const column of supportedColumns) {
    const payload = { ...profileBaseUpdate, [column]: displayName };
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(payload as never, { onConflict: "id" });

    if (!updateError) {
      upserted = true;
      break;
    }

    if (!updateError.message.includes(`'${column}' column`)) {
      return { status: "error", message: updateError.message };
    }
  }

  if (!upserted) {
    const { error: fallbackError } = await supabase
      .from("profiles")
      .upsert(profileBaseUpdate as never, { onConflict: "id" });
    if (fallbackError) {
      return { status: "error", message: fallbackError.message };
    }

    return {
      status: "error",
      message:
        "Saved avatar, but name could not be updated. Add a 'display_name' or 'full_name' column to the profiles table.",
    };
  }

  if (displayName) {
    await supabase.auth.updateUser({ data: { display_name: displayName } });
  }

  revalidatePath("/profile");
  return { status: "success", message: "Profile updated." };
}

export async function updateApiKeyStatus(status: "present" | "absent") {
  const supabase = getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return;
  }

  await supabase.from("profiles").upsert({ id: session.user.id, api_key_status: status }, { onConflict: "id" });

  revalidatePath("/profile");
}
