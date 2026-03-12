import type {
  PrintTemplateKey,
  PrintTemplateSectionKey,
} from "@/constants/printConfig";

export type PrintTemplateSectionRecord = {
  key: PrintTemplateSectionKey;
  label: string;
  description: string;
  displayOrder: number;
  defaultOrder: number;
};

export type PrintTemplateRecord = {
  key: PrintTemplateKey;
  label: string;
  description: string;
  paperLabel: string;
  sections: PrintTemplateSectionRecord[];
  customized: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
};

export type PrintTemplateWorkspaceResponse = {
  templates: PrintTemplateRecord[];
  summary: {
    total: number;
    customized: number;
    sections: number;
  };
};

export type PrintTemplateUpdateInput = {
  templateKey: PrintTemplateKey;
  sections: Array<{
    key: PrintTemplateSectionKey;
    displayOrder: number;
  }>;
};
