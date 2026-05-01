import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditableArea } from "./page";
import {EditableText } from "./page";
import { EditableFooterZone } from "./page";

describe("EditableText", () => {
  // MAIN FUNCTIONALITY TESTS

  // Test EditableText Render and Initalization
  it("renders component, no value changes", () => {
    render(<EditableText value="" onChange={() => {}} />); //render component
    const placeholderText = screen.getByText("Click to edit");
    expect(placeholderText).toBeInTheDocument(); // check for placeholder text
    expect(placeholderText.tagName).toBe("SPAN");
    const textComponentBox = placeholderText.closest("div");
    expect(textComponentBox).toBeInTheDocument(); // check for text component box
  });

  // Test that the component is a clickable area that renders an input on click
  it("on click renders the editable area and puts text placeholder", () => {
    render(<EditableText value="" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Click to edit"));
    const textComponent = screen.getByRole("textbox");
    expect(textComponent).toBeInTheDocument();
  });

  //test that the component when given a new class name, applies it to the input object
  it("applies class name to input", () => {
    render(<EditableText value="" onChange={() => {}} className="test-class"/>);
    const textComponent = screen.getByText("Click to edit").closest("div");
    expect(textComponent).toHaveClass("test-class"); // check the component prepares unique class before click
    fireEvent.click(screen.getByText("Click to edit"));
    const inputComponent = screen.getByRole("textbox");
    expect(inputComponent).toHaveClass("test-class"); // check for changes to class name after click and input render
  });

  // MUTABILITY TESTS BY CHANGING VALUES

  // Test that the component updates its text content when the value prop changes
  it("updates text content on prop change", () => {
    const { rerender } = render(<EditableText value="" onChange={() => {}} />);
    expect(screen.getByText("Click to edit")).toBeInTheDocument(); // check for initial placeholder text
    rerender(<EditableText value="New text" onChange={() => {}} />);
    expect(screen.getByText("New text")).toBeInTheDocument(); // check for updated text content
  });

  // Test that the component will display changed placeholder text when the value is empty, and will display the value when it is not empty
  it("displays placeholder when value is empty and value when not empty", () => {
    const { rerender } = render(<EditableText value="" onChange={() => {}} placeholder="Add Text"/>); 
    expect(screen.getByText("Add Text")).toBeInTheDocument();
    rerender(<EditableText value="Some content" onChange={() => {}}/>);
    expect(screen.getByText("Some content")).toBeInTheDocument();
  });

  // Test that the component will render the placeholder text when the value is deleted and the input is blurred
  it("renders placeholder when value is deleted and input is blurred", () => {
    let value = "Some content";
    const handleChange = (v: string) => { value = v; 
    rerender(<EditableText value={value} onChange={handleChange}/>);  
    };
    const { rerender } = render(<EditableText value="Some content" onChange={handleChange}/>); 
    expect(screen.getByText("Some content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Some content"));
    const editableTextComponent = screen.getByRole("textbox");
    fireEvent.change(editableTextComponent, { target: { value: "" } });
    fireEvent.blur(editableTextComponent);
    expect(screen.getByText("Click to edit")).toBeInTheDocument();
  });


});
    


describe("EditableArea", () => {
  // MAIN FUNCTIONALITY TESTS

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

describe("EditableFooterZone", () => {
  // MAIN FUNCTIONALITY TESTS

  // Test EditableFooterZone Render and Initalization
  it("renders component, no value changes", () => {
    render(<EditableFooterZone value="" pageNumber={0} onChange={() => {}} />);
    const placeholderText = screen.getByText("Click to add footer content...");
    expect(placeholderText).toBeInTheDocument();
    expect(placeholderText.tagName).toBe("SPAN");
    const textComponentBox = placeholderText.closest("div");
    expect(textComponentBox).toBeInTheDocument();
  });

  // Test that the component is a clickable area that renders a text area on click
  it("on click renders the editable area and puts text placeholder", () => {
    render(<EditableFooterZone value="" pageNumber={0} onChange={() => {}} placeholder="Footer Text"/>);
    fireEvent.click(screen.getByText("Footer Text"));
    const textComponent = screen.getByRole("textbox");
    expect(textComponent).toBeInTheDocument();
  });

  //Tests that the {PAGE} token is visible in edit mode to clarify usage to users
  it("displays {PAGE} token in edit mode", () => {
    const { rerender } = render(<EditableFooterZone value="Page {PAGE}" pageNumber={5} onChange={() => {}} />);
    fireEvent.click(screen.getByText("Page 5"));
    expect(screen.getByText("Page {PAGE}")).toBeInTheDocument();
  });

  // MUTABILITY TESTS BY CHANGING VALUES

  //Tests the mutability of the {PAGE} token in the footer zone
  it("tests mutability of {PAGE} token, doesn't update on prop change", () => {
    const { rerender } = render(<EditableFooterZone value="Page {PAGE}" pageNumber={5} onChange={() => {}} />);
    expect(screen.getByText("Page 5")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Page 5"));
    expect(screen.getByText("Page {PAGE}")).toBeInTheDocument();
    rerender(<EditableFooterZone value="Page {PAGE}" pageNumber={10} onChange={() => {}} />);
    expect(screen.getByText("Page {PAGE}")).toBeInTheDocument(); // check that {PAGE} token is still present and not changed to new page number (no overwrite) on edit
  });

  //Tests enumeration of pages when footer is not manually edited (page enumeration)
  it("updates displayed page number (enumeration) when not editing", () => {
  const { rerender } = render(
    <EditableFooterZone value="Page {PAGE}" pageNumber={1} onChange={() => {}} />
  );

  expect(screen.getByText("Page 1")).toBeInTheDocument();

  rerender(
    <EditableFooterZone value="Page {PAGE}" pageNumber={2} onChange={() => {}} />
  );

  expect(screen.getByText("Page 2")).toBeInTheDocument();
});


  // Test that the component upon being given a class name, applies it to the text area object
  it("applies class name to text area", () => {
    render(<EditableFooterZone value="" pageNumber={0} onChange={() => {}} className="test-class"/>);
    const textComponent = screen.getByText("Click to add footer content...").closest("div");
    expect(textComponent).toHaveClass("test-class"); // check the component prepares unique class before click
    fireEvent.click(screen.getByText("Click to add footer content..."));
    const textAreaComponent = screen.getByRole("textbox");
    expect(textAreaComponent).toHaveClass("test-class"); // check for changes to class name after click and text area render
  });

  // Test that the component when given a new placeholder value, updates the placeholder text in the text area
  it("updates placeholder text on prop change", () => {
    const { rerender } = render(<EditableFooterZone value="" pageNumber={0} onChange={() => {}}/>);
    expect(screen.getByText("Click to add footer content...")).toBeInTheDocument();
    rerender(<EditableFooterZone value="" pageNumber={0} onChange={() => {}} placeholder="Updated placeholder" />);
    expect(screen.getByText("Updated placeholder")).toBeInTheDocument();
  });

  // Test that the component when given a new value, updates the text in the text area
  it("updates text area value on prop change", () => {
    const { rerender } = render(<EditableFooterZone value="" pageNumber={0} onChange={() => {}}/>);
    expect(screen.getByText("Click to add footer content...")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Click to add footer content..."));
    const textAreaComponent = screen.getByRole("textbox");
    expect(textAreaComponent).toHaveValue("");
    rerender(<EditableFooterZone value="New content" pageNumber={0} onChange={() => {}}/>);
    expect(textAreaComponent).toHaveValue("New content");
  });

  // Test that the component will display changed placeholder text when the value is empty, and will display the value when it is not empty
  it("displays placeholder when value is empty and value when not empty", () => {
    const { rerender } = render(<EditableFooterZone value="" pageNumber={0} onChange={() => {}} placeholder="Add Text"/>); 
    expect(screen.getByText("Add Text")).toBeInTheDocument();
    rerender(<EditableFooterZone value="Some content" pageNumber={0} onChange={() => {}}/>);
    expect(screen.getByText("Some content")).toBeInTheDocument();
  });

  // Test that the component will render the placeholder text when the value is deleted and the text area is blurred
  it("displays placeholder when value is deleted and text area is blurred", () => {
    let value = "Some content";
    const handleChange = (v: string) => { value = v; 
    rerender(<EditableFooterZone value={value} pageNumber={0} onChange={handleChange}/>);  
    }
    const { rerender } = render(<EditableFooterZone value="Some content" pageNumber={0} onChange={handleChange}/>); 
    expect(screen.getByText("Some content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Some content"));
    const textAreaComponent = screen.getByRole("textbox");
    fireEvent.change(textAreaComponent, { target: { value: "" } });
    fireEvent.blur(textAreaComponent);
    expect(screen.getByText("Click to add footer content...")).toBeInTheDocument();
  });
});

