export {
  createClient,
  createServerClient,
  createAdminClient,
  type Database,
  type Tables,
  type InsertDto,
  type UpdateDto,
} from "./client";

export type {
  TypedSupabaseClient,
  AuthUser,
  UserProfile,
  Workspace,
  WorkspaceMember,
  Document,
  WorkspaceWithMembers,
  DocumentWithCreator,
  WorkspaceRole,
  CreateWorkspaceInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  UpdateProfileInput,
  AddWorkspaceMemberInput,
  PermissionCheck,
} from "./types";
