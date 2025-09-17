export type ProjectMeta = {
  name: string;
  path: string;
  lastModified: string;
  sessionCount: number;
  lastActivity?: string;
};

export type SessionMetadata = {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  lastModified: string;
  isAccessible: boolean;
};

export type Project = {
  id: string;
  name: string;
  path: string;
  meta: ProjectMeta;
  sessions: SessionMetadata[];
  lastModified: string;
  sessionCount: number;
  lastActivity?: string;
  hasValidMeta: boolean;
};