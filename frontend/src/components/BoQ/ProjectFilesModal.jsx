import React from "react";
import ProjectFilesComponent from "./ProjectFilesComponent";

const ProjectFilesModal = React.forwardRef(
    (
        {
            isOpen,
            onClose,
            project, // Keep project prop
            onFileDeleted,
            onFileSelect,
            onOpenOnlvUploader, // This will now receive a BOQ object
            currentUser,
        },
        ref
    ) => {
        const handleFileDeleted = (fileId) => {
            if (onFileDeleted) {
                onFileDeleted(fileId);
            }
        };

        const handleFileSelect = (jsonData, file) => {
            if (onFileSelect) {
                onFileSelect(jsonData, file);
            }
        };

        return (
            <ProjectFilesComponent
                ref={ref}
                project={project} // Pass the entire project object
                onFileDeleted={handleFileDeleted}
                onFileSelect={handleFileSelect}
                onOpenOnlvUploader={onOpenOnlvUploader} // This will now pass the BOQ object
                isOpen={isOpen}
                onClose={onClose}
                currentUser={currentUser}
            />
        );
    }
);

ProjectFilesModal.displayName = "ProjectFilesModal";

export default ProjectFilesModal;
