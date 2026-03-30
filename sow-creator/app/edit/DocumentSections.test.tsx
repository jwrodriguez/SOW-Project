import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DocumentPage, SortableSectionBlock } from "./page";
import { HeaderFooterData, SectionNode } from "@/types/pageTypes";

const createMockHF = (): HeaderFooterData => ({
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "",
  showPageNumbers: false,
  pageNumberPosition: "footer-right"
});

describe("DocumentPage", () => {
  let mockHF: HeaderFooterData;
  let onHF: jest.Mock;

  beforeEach(() => {
    mockHF = createMockHF();
    onHF = jest.fn();
  });

  it("renders default header/footer placeholders", () => {
    render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={0} children/>);

    expect(screen.getByText("Header left")).toBeInTheDocument();
    expect(screen.getByText("Header center")).toBeInTheDocument();
    expect(screen.getByText("Header right")).toBeInTheDocument();
    expect(screen.getByText("Footer left")).toBeInTheDocument();
    expect(screen.getByText("Footer center")).toBeInTheDocument();
    expect(screen.getByText("Footer right")).toBeInTheDocument();
  });

  it("applies the expected text alignment classes to footer sections", () => {
    render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={0} children/>);

    const footerLeft = screen.getByText("Footer left").closest("div");
    const footerCenter = screen.getByText("Footer center").closest("div");
    const footerRight = screen.getByText("Footer right").closest("div");

    expect(footerLeft).toHaveClass("text-left");
    expect(footerCenter).toHaveClass("text-center");
    expect(footerRight).toHaveClass("text-right");
  });

  it("renders children content inside the page body", () => {
    render(
      <DocumentPage hf={mockHF} onHF={onHF} pageNumber={0}>
        <h1>Some Body Content Here</h1>
      </DocumentPage>
    );

    expect(screen.getByText("Some Body Content Here")).toBeInTheDocument();
  });

  it("renders page numbers in footer values using the {PAGE} token", () => {
    mockHF.footerRight = "Page {PAGE}";
    render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);

    expect(screen.getByText("Page 5")).toBeInTheDocument();
  });

  it("replaces {PAGE} in the configured footer position", () => {
    mockHF.pageNumberPosition = "footer-center";
    mockHF.footerCenter = "Page {PAGE}";
    render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);

    expect(screen.getByText("Page 5")).toBeInTheDocument();
    expect(screen.queryByText("Page {PAGE}")).not.toBeInTheDocument();
  });

  it("updates rendered page number when rerendered", () => {
    mockHF.footerRight = "Page {PAGE}";
    const { rerender } = render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={1} children/>);

    expect(screen.getByText("Page 1")).toBeInTheDocument();

    rerender(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={2} children/>);
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("does not replace {PAGE} token inside header text", () => {
    mockHF.headerLeft = "Page {PAGE}";
    mockHF.footerRight = "Footer Information";
    render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);

    expect(screen.getByText("Footer Information")).toBeInTheDocument();
    expect(screen.queryByText("Page 5")).not.toBeInTheDocument();
  });
});

describe("SortableSectionBlock", () => {
  let section: SectionNode;
  let onUpdate: jest.Mock;
  let onAddChild: jest.Mock;
  let onAddSibling: jest.Mock;
  let onDelete: jest.Mock;
  let onAddTable: jest.Mock;
  let onDeleteTable: jest.Mock;
  let onUpdateCell: jest.Mock;
  let onSelect: jest.Mock;
  let onToggleLock: jest.Mock;
  let onClickBlank: jest.Mock;
  let onDeleteBlank: jest.Mock;

  beforeEach(() => {
    section = {
      id: "sec-1",
      number: "1.0",
      title: "Project Overview",
      content: "This is the section content.",
      locked: false,
      tables: [],
      children: []
    };

    onUpdate = jest.fn();
    onAddChild = jest.fn();
    onAddSibling = jest.fn();
    onDelete = jest.fn();
    onAddTable = jest.fn();
    onDeleteTable = jest.fn();
    onUpdateCell = jest.fn();
    onSelect = jest.fn();
    onToggleLock = jest.fn();
    onClickBlank = jest.fn();
    onDeleteBlank = jest.fn();
  });

  it("renders section number, title, and content", () => {
    render(
      <SortableSectionBlock
        section={section}
        depth={0}
        isOnlyTop={false}
        isSelected={false}
        fields={[]}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddChild={onAddChild}
        onAddSibling={onAddSibling}
        onDelete={onDelete}
        onToggleLock={onToggleLock}
        onAddTable={onAddTable}
        onDeleteTable={onDeleteTable}
        onUpdateCell={onUpdateCell}
        onClickBlank={onClickBlank}
        onDeleteBlank={onDeleteBlank}
      />
    );

    expect(screen.getByText("1.0")).toBeInTheDocument();
    expect(screen.getByText("Project Overview")).toBeInTheDocument();
    expect(screen.getByText("This is the section content.")).toBeInTheDocument();
  });

  it("reveals the hover toolbar and calls add child, add sibling, and delete callbacks", () => {
    render(
      <SortableSectionBlock
        section={section}
        depth={0}
        isOnlyTop={false}
        isSelected={false}
        fields={[]}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddChild={onAddChild}
        onAddSibling={onAddSibling}
        onDelete={onDelete}
        onToggleLock={onToggleLock}
        onAddTable={onAddTable}
        onDeleteTable={onDeleteTable}
        onUpdateCell={onUpdateCell}
        onClickBlank={onClickBlank}
        onDeleteBlank={onDeleteBlank}
      />
    );

    const root = screen.getByText("Project Overview").closest("div");
    expect(root).toBeTruthy();

    fireEvent.mouseEnter(root!);
    fireEvent.click(screen.getByTitle("Add subsection"));
    fireEvent.click(screen.getByTitle("Add section at same level"));
    fireEvent.click(screen.getByTitle("Delete section"));

    expect(onAddChild).toHaveBeenCalledTimes(1);
    expect(onAddSibling).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("opens the add table form and calls onAddTable with default row and column values", () => {
    render(
      <SortableSectionBlock
        section={section}
        depth={0}
        isOnlyTop={false}
        isSelected={false}
        fields={[]}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddChild={onAddChild}
        onAddSibling={onAddSibling}
        onDelete={onDelete}
        onToggleLock={onToggleLock}
        onAddTable={onAddTable}
        onDeleteTable={onDeleteTable}
        onUpdateCell={onUpdateCell}
        onClickBlank={onClickBlank}
        onDeleteBlank={onDeleteBlank}
      />
    );

    const root = screen.getByText("Project Overview").closest("div");
    fireEvent.mouseEnter(root!);

    fireEvent.click(screen.getByTitle("Add table"));
    fireEvent.click(screen.getByText("Add"));

    expect(onAddTable).toHaveBeenCalledWith(3, 3);
  });
});

