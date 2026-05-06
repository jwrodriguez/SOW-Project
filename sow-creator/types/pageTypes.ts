// ============= PAGE.TSX TYPES =============
// TypeScript type definitions for every data shape in the page.tsx file.
// FieldType is the set of allowed blank field types.
// TemplateField describes one fillable blank slot inserted into section content.
// SectionNode is recursive — children: SectionNode[] enables nested subsections.
// locked: boolean on SectionNode controls whether the section is editable.
// TemplateData is the top-level document object that gets serialized to JSON on Save.

/**
 * The seven allowed types for a fillable blank field.
 * Used by admins when inserting blanks into locked sections.
 * Engineers see these rendered as colored chips they can click to fill in.
 */
export type FieldType = "text" | "number" | "word" | "sentence" | "paragraph" | "list" | "date";

/**
 * Describes one fillable blank that an admin inserts into a section. Stored in
 * TemplateData.fields and referenced inside section content strings as {{field_id}} tokens.
 * SectionContent parses those tokens and renders each one as a colored BlankChip.
 *
 * - `id`: Unique identifier, also used as the token key e.g. {{field_project_name_123}}
 * - `label`: Display name shown on the chip e.g. "Project Name"
 * - `type`: Controls the chip color and expected input format
 * - `defaultValue`: Pre-filled value an engineer sees when they open the template
 * - `placeholder`: Hint text shown inside the blank when empty
 * - `required`: Whether the engineer must fill this in before submitting
 */
export type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
};

/**
 * Represents a section block's information listed on the opened document.
 * The children field is recursive so sections can contain subsections to any depth.
 * Content strings may contain {{field_id}} tokens which render as blank chips.
 *
 * - `id`: Unique identifier for this section, used for scrolling and state updates
 * - `number`: Auto-generated number e.g. "1.0" or "2.3.1"
 * - `title`: Formal title of the section block
 * - `content`: Body text of the section, may contain {{field_id}} tokens
 * - `locked`: When true, engineers cannot edit this section's text. Admins always can.
 *             Engineers can still interact with blank chips inside a locked section.
 * - `tables`: List of tables associated with the document section block
 * - `children`: List of subsections associated with the document section block
 */
export type SectionNode = {
  id: string;
  number: string;
  title: string;
  content: string;
  lockEdit: boolean;
  lockDelete: boolean;
  lockAddTable: boolean;
  lockAddSections: boolean;
  tables?: TableData[];
  children: SectionNode[];
};

/**
 * Represents one table attached to a section.
 *
 * - `id`: Table identifier
 * - `rows`: Number of rows in the table
 * - `cols`: Number of columns in the table
 * - `data`: 2D matrix of cell values, accessed via data[row_idx][col_idx]
 */
export type TableData = {
  id: string;
  rows: number;
  cols: number;
  data: string[][];
};


/**
 * Controls what appears in the header and footer on document pages. Each zone
 * (left, center, right) is independently editable. Footer zones support the
 * {PAGE} token which gets replaced with the real page number at render time.
 *
 * - `headerLeft`: Text content for the left header zone
 * - `headerCenter`: Text content for the center header zone
 * - `headerRight`: Text content for the right header zone
 * - `footerLeft`: Text content for the left footer zone
 * - `footerCenter`: Text content for the center footer zone
 * - `footerRight`: Text content for the right footer zone
 * - `showPageNumbers`: Whether page numbers should be rendered
 * - `pageNumberPosition`: Where the page number appears — "footer-center", "footer-right", or "footer-left"
 */
export type HeaderFooterData = {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  showPageNumbers: boolean;
  pageNumberPosition: "footer-center" | "footer-right" | "footer-left";
};

/**
 * The top-level document object. Everything in the editor lives inside this shape.
 * This is what gets serialized to JSON on Save and deserialized on Load. Both the
 * admin template editor and the engineer SOW page work with this same structure.
 *
 * - `documentName`: Title of the SOW document file
 * - `fields`: All fillable blank definitions. Sections reference these by {{id}} token.
 *             Admins create and configure these. Engineers fill them in.
 * - `coverPage`: SOW cover page information
 * - `headerFooter`: SOW document header and footer data
 * - `sections`: List of sections, subsections, and tables that make up the document
 */
export type TemplateData = {
  documentName: string;
  fields: TemplateField[];
  coverPage?: any; // Marked optional for migration purposes
  headerFooter: HeaderFooterData;
  sections: SectionNode[];
};