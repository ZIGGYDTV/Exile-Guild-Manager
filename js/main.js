// Initialization - this runs last
window.addEventListener('DOMContentLoaded', () => {
    console.log("=== GAME INITIALIZATION STARTING ===");
    
    game.init();
    console.log("After game.init() - Exiles:", gameState.exiles);
    console.log("Selected exile ID:", gameState.selectedExileId);
    
    exileRowManager.init();
    console.log("exileRowManager initialized");
    
    // Make sure we refresh the rows AFTER everything is loaded
    exileRowManager.refreshAllRows();
    console.log("Exile rows refreshed");
    
    dynamicDisplayManager.init();
    console.log("dynamicDisplayManager initialized");
    
    console.log("=== INITIALIZATION COMPLETE ===");
});