// This file is like a central storage room for our ONLV table data.
// In React, sometimes different parts of our app (called "components") need to share the same information.
// Instead of passing this information down through many layers of components (which can get messy),
// we can use something called "Context".

// Think of Context as a global bulletin board.
// One component can post information to the board, and any other component can read it,
// as long as they are in the right "room".

// In this file, we do three things:
// 1. We create the "bulletin board" itself, which we call `OnlvTableContext`.
// 2. We create a special component called `OnlvTableProvider`. This component is like the "room"
//    that holds the bulletin board. Any component inside this room can access the shared data.
//    It's also responsible for managing the data (e.g., updating it).
// 3. We create a helper function called `useOnlvTableContext`. This is a shortcut for other components
//    to easily read the information from our bulletin board without a lot of extra code.

import React, { createContext, useContext, useState } from "react"; // We need these tools from React to create our context and manage its data.

// Here, we are creating our "bulletin board" (the Context).
// It's like creating an empty box that will later hold our shared data.
const OnlvTableContext = createContext();

// This is our "Provider" component. It's the one that "provides" the shared data to other components.
// You can think of it as the manager of our central storage room.
// It takes one special property called `children`. `children` represents any other components
// that are placed inside this provider.
export function OnlvTableProvider({ children }) {
    // Here, we create a piece of information that we want to share.
    // We use `useState` to create a "state variable" called `tableData`.
    // `tableData` will hold the actual data for our ONLV table. It starts as `null` (empty).
    // `setTableData` is a special function that lets us update `tableData`.
    const [tableData, setTableData] = useState(null);

    // The Provider component returns the `OnlvTableContext.Provider`.
    // This is the part that makes the data available to all its children.
    // The `value` property is very important. It's an object that holds all the data and functions
    // we want to share. In this case, we are sharing `tableData` and `setTableData`.
    return (
        <OnlvTableContext.Provider value={{ tableData, setTableData }}>
            {children}{" "}
            {/* This renders all the child components inside the provider. */}
        </OnlvTableContext.Provider>
    );
}

// This is a "custom hook". A hook in React is a special function that lets you "hook into" React features.
// We created this custom hook to make it super easy for other components to get the shared data.
// Instead of writing `useContext(OnlvTableContext)` every time, they can just write `useOnlvTableContext()`.
export function useOnlvTableContext() {
    // `useContext` is the React hook that actually reads the value from our context "bulletin board".
    const context = useContext(OnlvTableContext);

    // This is a safety check. If a component tries to use this hook but it's not inside
    // an `OnlvTableProvider` "room", the `context` will be empty.
    // In that case, we show an error to the developer to let them know they made a mistake.
    // This helps prevent bugs.
    if (!context) {
        throw new Error(
            "useOnlvTableContext must be used within an OnlvTableProvider"
        );
    }

    // If everything is okay, we return the context, which contains our shared data (`tableData`)
    // and the function to update it (`setTableData`).
    return context;
}
