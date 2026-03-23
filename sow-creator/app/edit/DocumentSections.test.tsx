import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DocumentPage } from "./page";
import { HeaderFooterData } from "@/types/pageTypes";

const mockHF: HeaderFooterData = {
    headerLeft: "",
    headerCenter: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
    showPageNumbers: false,
    pageNumberPosition: "footer-right"
};

describe("DocumentPage", () => {
    //MAIN FUNCTIONALITY TESTS
    const onHF = jest.fn();

    //Test DocumentPage Render and Intitalization
    it("renders component, no value changes", () => {
        render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={0} children/>);
        expect(screen.getByText("Header left")).toBeInTheDocument();
        expect(screen.getByText("Header center")).toBeInTheDocument();
        expect(screen.getByText("Header right")).toBeInTheDocument();
        expect(screen.getByText("Footer left")).toBeInTheDocument();
        expect(screen.getByText("Footer center")).toBeInTheDocument();
        expect(screen.getByText("Page {PAGE}")).toBeInTheDocument();
    })

    //Test DocumentPage loads children in it's body and renders it
    it("loads children in it's body and children can be accessed", () => {
        render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={0}><h1>Some Body Content Here</h1></DocumentPage>);
        
        expect(screen.getByText("Some Body Content Here")).toBeInTheDocument();
    })

    //Test DocumentPage loads page number, can be found on page
    it("page number is not loaded when flag is false", () => {
        render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        
        expect(screen.queryByText("Page 5")).not.toBeInTheDocument();
    })

    //Test DocumentPage loads page number, can be found on page
    it("loads page number with show page numbers flag", () => {
        mockHF.showPageNumbers = true;
        render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        
        expect(screen.getByText("Page 5")).toBeInTheDocument();
    })

    //Test DocumentPage loads page number, in section with position flag
    it("loads page number in area with positional flag", () => {
        mockHF.pageNumberPosition = "footer-center";
        mockHF.footerCenter = "Page {PAGE}"
        render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        
        expect(screen.getByText("Page 5")).toBeInTheDocument();
        expect(screen.queryByText("Page {PAGE}")).not.toBeInTheDocument();
    })

    //Test DocumentPage loads page number with updates
    it("loads page number, can be pulled from page even with rerenders", () => {
        const { rerender } = render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        expect(screen.getByText("Page 5")).toBeInTheDocument();
        rerender(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={6} children/>)
        expect(screen.getByText("Page 6")).toBeInTheDocument();
    })

    //MUTABILITY TESTS

    //Test DocumentPage implements updates to mockHF, can access those changes
    it("Header/Footer is updateable, can be pulled from page", () => {
        mockHF.headerLeft = "SOW Project"
        mockHF.footerCenter = "Page {PAGE}"
        const { rerender } = render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        
        expect(screen.getByText("SOW Project")).toBeInTheDocument();
        expect(screen.getByText("Page 5")).toBeInTheDocument();
        mockHF.footerCenter = "";
        rerender(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        expect(screen.getByText("Footer center")).toBeInTheDocument();
    })

    //Test DocumentPage page number is updated when rerenders are performed
    it("page number updated when rerenders are performed", () => {
        mockHF.footerCenter = "Page {PAGE}"
        const { rerender } = render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={1} children/>);
        expect(screen.getByText("Page 1")).toBeInTheDocument();
        rerender(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={2} children/>)
        expect(screen.getByText("Page 2")).toBeInTheDocument();
        mockHF.footerCenter = "";
    })

    //Test DocumentPage should not load Page Number in Header Information
    it("Page number should not load when syntax is present in header", () => {
        mockHF.headerLeft = "Page {PAGE}"
        mockHF.footerRight = "Footer Information"
        render(<DocumentPage hf={mockHF} onHF={onHF} pageNumber={5} children/>);
        
        expect(screen.getByText("Footer Information")).toBeInTheDocument();
        expect(screen.queryByText("Page 5")).not.toBeInTheDocument();
    })
});

