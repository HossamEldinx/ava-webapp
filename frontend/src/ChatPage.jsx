import React from "react";
import ChatApp from "./components/chat/ChatInterface";

function ChatPage({ onSendDataToOnlv }) {
    return (
        <div className="h-screen bg-gray-900">
            <div className="h-[calc(100vh-88px)]">
                <ChatApp onSendDataToOnlv={onSendDataToOnlv} />
            </div>
        </div>
    );
}

export default ChatPage;
