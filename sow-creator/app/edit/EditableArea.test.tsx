import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditableArea } from "./page";

describe("EditableArea", () => {
  // Test EditableArea Render and Initalization
  it("renders component, no value changes", () => {
    render(<EditableArea value="" onChange={() => {}} />);
    const placeholderText = screen.getByText("Click to add content...");
    expect(placeholderText).toBeInTheDocument();
    expect(placeholderText.tagName).toBe("SPAN");
    const textComponentBox = placeholderText.closest("div");
    expect(textComponentBox).toBeInTheDocument();
  });

  // Test that the component is a clickable area that renders a text area on click
  it("on click renders the editable area and puts text placeholder", () => {
    render(<EditableArea value="" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Click to add content..."));
    const textComponent = screen.getByRole("textbox");
    expect(textComponent).toBeInTheDocument();
  });

  // MUTABILITY TESTS BY CHANGING VALUES

  // Test that the component upon being given a class name, applies it to the text area object
  it("applies class name to text area", () => {
    render(<EditableArea value="" onChange={() => {}} className="test-class"/>);
    const textComponent = screen.getByText("Click to add content...").closest("div");
    expect(textComponent).toHaveClass("test-class"); // check the component prepares unique class before click
    fireEvent.click(screen.getByText("Click to add content..."));
    const textAreaComponent = screen.getByRole("textbox");
    expect(textAreaComponent).toHaveClass("test-class"); // check for changes to class name after click and text area render
  });

  // Test that the component when given a new placeholder value, updates the placeholder text in the text area
  it("updates placeholder text on prop change", () => {
    const { rerender } = render(<EditableArea value="" onChange={() => {}}/>);
    expect(screen.getByText("Click to add content...")).toBeInTheDocument();
    rerender(<EditableArea value="" onChange={() => {}} placeholder="Updated placeholder" />);
    expect(screen.getByText("Updated placeholder")).toBeInTheDocument();
  }); 

  // Test that the component when given a new value, updates the text in the text area
  it("updates text area value on prop change", () => {
    const { rerender } = render(<EditableArea value="" onChange={() => {}}/>);
    expect(screen.getByText("Click to add content...")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Click to add content..."));
    const textAreaComponent = screen.getByRole("textbox");
    expect(textAreaComponent).toHaveValue("");
    rerender(<EditableArea value="New content" onChange={() => {}}/>);
    expect(textAreaComponent).toHaveValue("New content");
  });

 // Test that the component will display changed placeholder text when the value is empty, and will display the value when it is not empty
  it("displays placeholder when value is empty and value when not empty", () => {
    const { rerender } = render(<EditableArea value="" onChange={() => {}} placeholder="Add Text"/>); 
    expect(screen.getByText("Add Text")).toBeInTheDocument();
    rerender(<EditableArea value="Some content" onChange={() => {}}/>);
    expect(screen.getByText("Some content")).toBeInTheDocument();
  });

  // Test that the component will render the placeholder text when the value is deleted and the text area is blurred
  it("displays placeholder when value is deleted and text area is blurred", () => {
    let value = "Some content";
    const handleChange = (v: string) => { value = v; 
    rerender(<EditableArea value={value} onChange={handleChange}/>);  
    };
    const { rerender } = render(<EditableArea value="Some content" onChange={handleChange}/>); 
    expect(screen.getByText("Some content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Some content"));
    const textAreaComponent = screen.getByRole("textbox");
    fireEvent.change(textAreaComponent, { target: { value: "" } });
    fireEvent.blur(textAreaComponent);
    expect(screen.getByText("Click to add content...")).toBeInTheDocument();
  });

  // it("calls onChange when text is entered", () => {
  //   const handleChange = jest.fn();
  //   const { getByText, getByRole } = render(<EditableArea value="" onChange={handleChange} placeholder="Enter text" />);
  //   getByText("Enter text").click();
  //   const textarea = getByRole("textbox");
  //   textarea.value = "New content";
  //   textarea.dispatchEvent(new Event("input"));
  //   expect(handleChange).toHaveBeenCalledWith("New content");
  // });
});

