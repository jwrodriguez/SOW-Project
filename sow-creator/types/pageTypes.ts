// ============= PAGE.TSX TYPES =============
/**
 * Represents a section block's information listed on the opened document
 * - `id`: string input identifying the section block on the document
 * - `number`: Number indicating the section block's position in the document
 * - `title`: Formal title of the section block
 * - `content`: Formal description of the section block
 * - `locked`: boolean value indicating whether the section block is locked from editing
 * - `tables`: List of tables associated with the document section block
 * - `children`: List of subsections associated with the document section block
 */
export type SectionNode = {
  id: string;
  number: string;
  title: string;
  content: string;
  locked: boolean;
  tables?: TableData[];
  children: SectionNode[];
};


/**
 * Table Information
 * - `id`: Table Identifier
 * - `rows`: Number of rows in the table
 * - `cols`: Number of columns in the table
 * - `data`: 2D Matrix of text data, can be accessed via [row_idx][col_idx]
 */
export type TableData = { 
    id: string; 
    rows: number; 
    cols: number; 
    data: string[][]
 };
/**
 * Cover Information for a Statement of Work (SOW)
 * - `title`: Title of the SOW
 * - `projectNumber`: SOW Project Identification Number
 * - `clientName`: Vendor Recieving the Statement of Work
 * - `preparedBy`: Document Author
 * - `department`: Department/Branch issuing the Statement of Work
 * - `date`: Statement of Work Publishing Date
 * - `version`: Historical Identifier of the Statement of Work
 * - `confidentiality`: Level of Confidentiality
 */
export type CoverPageData = { 
    title: string; 
    projectNumber: string; 
    clientName: string; 
    building: string; 
    location: string; 
    preparedBy: string; 
    department: string; 
    date: string; 
    version: string; 
    confidentiality: string 
};

/**
 * Represents all editable header and footer fields for a document page.
 * - `headerLeft`: text content for space designated headerLeft
 * - `headerCenter`: text content for space designated headerCenter
 * - `headerRight`: text content for space designated headerRight
 * - `footerLeft`: text content for space designated footerLeft
 * - `footerCenter`: text content for space designated footerCenter
 * - `footerRight`: text content for space designated footerRight
 * - `showPageNumbers`: whether page numbers should be rendered
 * - `pageNumberPosition`: where the page number appears
 *   - "footer-center"
 *   - "footer-right"
 *   - "header-right"
 *
 * All pageNumberPosition fields support the `{PAGE}` token, which is replaced at render time.
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
 * Statement of Work overall template information
 * - `documentName`: Title of the SOW document file
 * - `coverPage`: SOW cover page information
 * - `headerFooter`: SOW document header footer data
 * - `sections`: List of sections/subsections/tables to be loaded into the SOW document 
 */
export type TemplateData = { 
    documentName: string; 
    coverPage: CoverPageData; 
    headerFooter: HeaderFooterData; 
    sections: SectionNode[]
 };