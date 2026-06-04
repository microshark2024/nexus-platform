// frontend/src/lib/workspace.ts
import { supabase } from "./supabase";

/**
 * Ensures the user has at least one workspace.
 * If none exists, creates a default workspace and registers the user as owner.
 * Returns the active workspace ID.
 */
export async function ensureDefaultWorkspace(userId: string, userEmail: string): Promise<string> {
  try {
    // 1. Fetch workspaces the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId);

    if (memberError) {
      throw memberError;
    }

    if (memberships && memberships.length > 0) {
      // User is already in at least one workspace. Return it.
      return memberships[0].workspace_id;
    }

    // 2. If no workspaces found, auto-create a default workspace
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const workspaceName = `${userEmail.split("@")[0]}'s Workspace`;
    const workspaceSlug = `workspace-${userId.substring(0, 4)}-${randomSuffix}`;

    // Insert workspace
    const { data: newWorkspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug: workspaceSlug,
        owner_id: userId,
      })
      .select()
      .single();

    if (wsError) {
      throw wsError;
    }

    if (!newWorkspace) {
      throw new Error("Failed to retrieve the created workspace record.");
    }

    // 3. Register user as owner in workspace_members
    const { error: joinError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: newWorkspace.id,
        user_id: userId,
        role: "owner",
      });

    if (joinError) {
      // Rollback workspace if member join fails to keep it clean
      await supabase.from("workspaces").delete().eq("id", newWorkspace.id);
      throw joinError;
    }

    return newWorkspace.id;
  } catch (err: any) {
    console.error("Workspace auto-provisioning failed:", err);
    if (err && typeof err === "object") {
      console.error("Detailed Database Error:", {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
    }
    throw err;
  }
}
