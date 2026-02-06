
## 4-7-8 Breathing App

A minimalist, mobile-friendly web application designed to guide users through the 4-7-8 breathing technique. This method is a rhythmic breathing pattern that helps reduce anxiety and aids in falling asleep.

## Features
- **Fluid Animations:** A central visual element that expands and contracts in sync with the breathing rhythm.
- **Accurate Timing: - Inhale:** 4 seconds
	 - **Hold:** 7 seconds
	 - **Exhale:** 8 seconds
- **Cycle Tracking:** Visual progress dots to track the recommended 4-cycle set.
Mobile Optimized: Fully responsive design using modern CSS (clamp, dvh) for a seamless experience on iOS and Android.
- **Zero Dependencies:** Built with pure HTML, CSS, and JavaScript.

## How to Use

 1. **Open the App:** Open index.html in any modern web browser.
 2. **Start:** Tap the "START" button to begin the first cycle.
 3. **Follow the Prompts:**
       - Inhale through your nose as the circle grows.
       - Hold your breath as the circle stays still.
       - Exhale forcefully through your mouth as the circle shrinks.
 4. **Repeat:** The app will automatically guide you through 4 full cycles.
 
## Technical Details

-   **Language:** HTML5, CSS3, JavaScript (ES6+).    
-   **Styling:** Custom CSS variables for easy theme customization.    
-   **Logic:** Uses asynchronous `Promise` based timers to ensure UI state and countdowns stay perfectly synchronized.   

## License

This project is open-source and free to use.
