// This file creates a dynamic image carousel (a slider) that can display multiple images.
// It's designed to show a collection of graphics, often used for displaying visual
// information related to a project, like blueprints, diagrams, or photos.

// The main idea of this file is to:
// 1. Take a list of image data (called `grafikTabelle`).
// 2. Arrange these images into a responsive carousel that users can slide through.
// 3. Allow users to click on an image to view it in a larger pop-up window (a "modal").
// 4. Provide navigation arrows and dots for easy browsing.

// It uses a popular library called "react-slick" to handle the carousel functionality,
// making it smooth and interactive. When a user clicks an image, a full-screen modal
// appears, showing the image in more detail, which can be closed by clicking outside
// or pressing the Escape key.

import React, { useState, useCallback, useEffect } from "react"; // We need React to build our user interface, manage changing data (useState), create functions that don't change unnecessarily (useCallback), and perform actions after the component is shown (useEffect).
import Slider from "react-slick"; // This is the main library that helps us create the image carousel.
import "slick-carousel/slick/slick.css"; // These are the basic styles for the carousel itself.
import "slick-carousel/slick/slick-theme.css"; // These are additional styles for the carousel's theme (like dots and arrows).
import "./ImageCarousel.css"; // This imports our own custom styles for the carousel.
import { getValue } from "../onlv/OnlvEdit"; // This imports a helper function `getValue` which is used to safely get data from our image objects.

// This is our main Image Carousel component. Think of it as a reusable block that displays images in a slider.
// It takes one piece of information (called "props"):
// - `grafikTabelle`: This is an object that contains a list of image data to be displayed.
const ImageCarousel = ({ grafikTabelle }) => {
    // `selectedImage` is a special variable that holds the image currently shown in the big pop-up modal.
    // `setSelectedImage` is the function we use to change the value of `selectedImage`.
    // It starts as `null` because no image is selected when the carousel first loads.
    const [selectedImage, setSelectedImage] = useState(null);

    // `openImageModal` is a function that opens the big image pop-up.
    // `useCallback` makes sure this function doesn't get recreated every time the component updates,
    // which helps our app run smoother.
    const openImageModal = useCallback((image) => {
        setSelectedImage(image); // When an image is clicked, we set it as the `selectedImage`.
    }, []); // The empty array `[]` means this function only gets created once.

    // `closeImageModal` is a function that closes the big image pop-up.
    // `useCallback` is used here for the same reason as `openImageModal`.
    const closeImageModal = useCallback(() => {
        setSelectedImage(null); // Setting `selectedImage` back to `null` hides the modal.
    }, []); // The empty array `[]` means this function only gets created once.

    // This `useEffect` is like a special listener that helps us close the modal when the user presses the "Escape" key.
    // It runs when `selectedImage` or `closeImageModal` changes.
    useEffect(() => {
        // This function checks if the pressed key was "Escape".
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeImageModal(); // If it was "Escape", we close the modal.
            }
        };
        // If an image is currently selected (meaning the modal is open), we start listening for key presses.
        if (selectedImage) {
            document.addEventListener("keydown", handleEscape);
        } else {
            // If no image is selected (modal is closed), we stop listening for key presses.
            document.removeEventListener("keydown", handleEscape);
        }
        // This part is important for cleaning up. When the component is removed or `selectedImage` changes,
        // we stop listening to prevent problems.
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [selectedImage, closeImageModal]); // This effect depends on `selectedImage` and `closeImageModal`.

    // This checks if there are any images to display. If not, the carousel won't show up.
    if (
        !grafikTabelle || // If `grafikTabelle` is empty or doesn't exist...
        !grafikTabelle.grafikelement || // ...or if it doesn't have an `grafikelement` list...
        grafikTabelle.grafikelement.length === 0 // ...or if the list of images is empty...
    ) {
        return null; // ...then we don't show anything.
    }

    // We get the actual list of images from `grafikTabelle`.
    const images = grafikTabelle.grafikelement;
    // We count how many images we have.
    const totalImages = images.length;

    // These are the settings for our image carousel. They tell the `react-slick` library
    // how the slider should behave (e.g., show dots, loop, how many images to show at once).
    const settings = {
        dots: true, // Show little dots at the bottom to indicate which slide is active.
        infinite: totalImages > 3, // Keep sliding forever (loop) only if there are more than 3 images.
        speed: 500, // How fast the slides change (in milliseconds).
        slidesToShow: 3, // Show 3 images at a time on larger screens.
        slidesToScroll: 1, // Move 1 image at a time when sliding.
        autoplay: true, // Automatically slide through images.
        autoplaySpeed: 3000, // How long to wait before sliding to the next image (3 seconds).
        responsive: [
            // These settings change based on the screen size (making it "responsive").
            {
                breakpoint: 1024, // When the screen width is 1024 pixels or less (for laptops/tablets).
                settings: {
                    slidesToShow: 2, // Show 2 images at a time.
                    slidesToScroll: 1, // Move 1 image at a time.
                    infinite: totalImages > 2, // Loop only if there are more than 2 images.
                },
            },
            {
                breakpoint: 640, // When the screen width is 640 pixels or less (for mobile phones).
                settings: {
                    slidesToShow: 1, // Show 1 image at a time.
                    slidesToScroll: 1, // Move 1 image at a time.
                    infinite: totalImages > 1, // Loop only if there is more than 1 image.
                },
            },
        ],
    };

    // This is a special component for the "Next" arrow button in the carousel.
    // It helps us customize how the arrow looks and behaves.
    function NextArrow(props) {
        const { className, style, onClick } = props; // We get some default properties from the `Slider` component.
        return (
            <div
                className={`${className} custom-arrow next-arrow`} // We add our own custom styles to the arrow.
                style={{ ...style, display: "block", right: "10px", zIndex: 1 }} // Position the arrow on the right.
                onClick={onClick} // When clicked, it triggers the next slide.
            />
        );
    }

    // This is a special component for the "Previous" arrow button in the carousel.
    // It's similar to `NextArrow` but for going backward.
    function PrevArrow(props) {
        const { className, style, onClick } = props; // We get some default properties from the `Slider` component.
        return (
            <div
                className={`${className} custom-arrow prev-arrow`} // We add our own custom styles to the arrow.
                style={{ ...style, display: "block", left: "10px", zIndex: 1 }} // Position the arrow on the left.
                onClick={onClick} // When clicked, it triggers the previous slide.
            />
        );
    }

    // This adjusts the `slidesToShow` setting if we have fewer than 3 images.
    // This prevents the carousel from showing empty spaces if there aren't enough images to fill all slots.
    if (totalImages < 3) {
        settings.slidesToShow = totalImages; // Show exactly the number of images we have.
        // We also adjust the responsive settings so it doesn't try to show more images than available.
        settings.responsive = settings.responsive.map((r) => ({
            ...r, // Keep all existing responsive settings.
            settings: {
                ...r.settings, // Keep existing settings for this breakpoint.
                slidesToShow: Math.min(r.settings.slidesToShow, totalImages), // Show the minimum of its original setting or the total images.
            },
        }));
    }

    // This is what our Image Carousel component actually shows on the screen.
    return (
        // This is the main container for our carousel, with some styling for spacing and background.
        <div className="container mx-auto my-8 p-6 bg-gray-800 rounded-lg text-gray-200">
            {/* This is the title displayed above the carousel. */}
            <h3 className="text-center text-blue-400 text-2xl font-bold mb-6">
                Grafiken
            </h3>
            {/* This is a wrapper for the carousel itself, allowing us to style the arrows. */}
            <div className="relative image-carousel-wrapper">
                {/* We only show the slider if there are images available. */}
                {totalImages > 0 ? (
                    // This is the `react-slick` Slider component.
                    <Slider
                        {...settings} // We pass all our defined settings to the slider.
                        nextArrow={<NextArrow />} // We use our custom "Next" arrow component.
                        prevArrow={<PrevArrow />} // We use our custom "Previous" arrow component.
                    >
                        {/* We go through each image in our `images` list and create a slide for it. */}
                        {images.map((grafikItem, index) => (
                            <div
                                key={index} // A unique key for each slide (important for React).
                                className="px-2" // Add some horizontal padding around each image.
                            >
                                <img
                                    // The `src` attribute creates the image from base64 data.
                                    // `getValue` is used to extract the format (e.g., "image/jpeg") and the actual image data.
                                    src={`data:${getValue(
                                        grafikItem.format
                                    )};base64,${getValue(grafikItem.daten)}`}
                                    // The `alt` text is important for accessibility and when images don't load.
                                    alt={
                                        getValue(grafikItem.bezeichnung) || // Use the image's description if available.
                                        `Grafik ${index + 1}` // Otherwise, use a generic "Graphic X".
                                    }
                                    // These are styling classes for the image.
                                    className="block w-full h-auto object-contain cursor-pointer rounded-lg"
                                    style={{ maxHeight: "300px" }} // Limit the maximum height of the image in the carousel.
                                    // When the image is clicked, open the big image modal.
                                    onClick={() => openImageModal(grafikItem)}
                                />
                            </div>
                        ))}
                    </Slider>
                ) : (
                    // If there are no images, display a message.
                    <p className="text-center">Keine Grafiken vorhanden.</p>
                )}
            </div>

            {/* This is the Image Modal (the big pop-up window for viewing a single image). */}
            {/* It only shows up if `selectedImage` has a value (meaning an image is selected). */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" // Full-screen overlay with a dark, semi-transparent background.
                    onClick={closeImageModal} // Clicking anywhere on the overlay closes the modal.
                >
                    <div
                        className="relative bg-gray-800 rounded-lg p-6 max-w-screen-lg max-h-full overflow-auto" // The actual modal content box.
                        onClick={(e) => e.stopPropagation()} // This stops clicks inside the modal from closing it (prevents "event bubbling").
                    >
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 text-3xl leading-none font-bold focus:outline-none" // Close button (an "X").
                            onClick={closeImageModal} // Clicking this button closes the modal.
                            aria-label="Close modal" // Good for accessibility.
                        >
                            &times; {/* The "X" character. */}
                        </button>
                        <img
                            // The `src` for the large image, similar to the carousel image.
                            src={`data:${getValue(
                                selectedImage.format
                            )};base64,${getValue(selectedImage.daten)}`}
                            // The `alt` text for the large image.
                            alt={
                                getValue(selectedImage.bezeichnung) ||
                                "Selected Grafik"
                            }
                            // Styling for the large image to fit within the modal.
                            className="block max-w-full max-h-[80vh] h-auto object-contain mx-auto rounded-lg"
                        />
                        {/* If the image has a description, display it below the image. */}
                        {getValue(selectedImage.bezeichnung) && (
                            <div className="text-center mt-4 text-gray-300">
                                {getValue(selectedImage.bezeichnung)}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Basic styling for custom arrows - can be moved to a CSS file */}
        </div>
    );
};

export default ImageCarousel; // We export our `ImageCarousel` component so other parts of the app can use it.
