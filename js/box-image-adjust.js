
 const BoxImageAdjust = (function() {
    'use strict';

    // Track if initialization is in progress to prevent duplicate runs
    let isInitializing = false;
    let windowContext = null;
    let $context = null;

    // Debounce helper (private)
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // Process all boxes in batches to avoid layout thrashing (private)
    function adjustAllBoxes() {
        const $ = $context || window.$;
        const boxData = [];
        
        // Batch all DOM reads first
        $('.image-container').each(function() {
            const $container = $(this);
            const $images = $container.find('.box-image');
            
            if ($images.length !== 2) return;
            
            const img1 = $images[0];
            const img2 = $images[1];
            
            if (!img1.complete || !img2.complete) return;
            if (!img1.naturalWidth || !img2.naturalWidth) return;
            
            boxData.push({
                $img1: $(img1),
                $img2: $(img2),
                containerHeight: $container.height(),
                containerWidth: $container.width(),
                img1AspectRatio: img1.naturalWidth / img1.naturalHeight,
                img2AspectRatio: img2.naturalWidth / img2.naturalHeight
            });
        });
        
        // Then batch all DOM writes
        requestAnimationFrame(() => {
            boxData.forEach(data => {
                // The wider image (higher aspect ratio) should take full width
                // The narrower image fills the remaining space

                if (data.img1AspectRatio === data.img2AspectRatio) {
                    // Equal aspect ratios - split space evenly
                    data.$img1.css('max-height', '50%');
                    data.$img2.css('max-height', '50%');
                } else {
                    if (data.img1AspectRatio > data.img2AspectRatio) {
                        // Image 1 is wider - give it full width
                        const img1Height = data.containerWidth / data.img1AspectRatio;
                        const remainingHeight = data.containerHeight - img1Height;
                        console.log(remainingHeight);
                        data.$img1.css('max-height', 'none');
                        data.$img2.css('max-height', Math.max(0, remainingHeight) + 'px');
                    } else {
                        // Image 2 is wider - give it full width
                        const img2Height = data.containerWidth / data.img2AspectRatio;
                        const remainingHeight = data.containerHeight - img2Height;
                                       console.log(remainingHeight);
                        data.$img2.css('max-height', 'none');
                        data.$img1.css('max-height', Math.max(0, remainingHeight) + 'px');
                    }
                }
            });
        });
    }

    // Wait for all images to load, then adjust (private)
    function initializeBoxes() {
        // Prevent multiple simultaneous initialization calls
        if (isInitializing) {
            return;
        }
        
        isInitializing = true;
        
        const $ = $context || window.$;
        const $allImages = $('.box-image');
        const promises = $allImages.map(function() {
            const img = this;
            if (img.complete && img.naturalWidth > 0) {
                return $.Deferred().resolve().promise();
            }
            return new Promise((resolve) => {
                $(img).one('load error', resolve);
            });
        }).get();
        
        Promise.all(promises).then(() => {
            // Give browser time to complete layout after images load
            setTimeout(() => {
                adjustAllBoxes();
                // Make boxes visible after first adjustment
                $('.box').addClass('ready');
                isInitializing = false;
            }, 100);
        }).catch(() => {
            // Fallback: run adjustment anyway
            setTimeout(() => {
                adjustAllBoxes();
                // Make boxes visible even on error
                $('.box').addClass('ready');
                isInitializing = false;
            }, 100);
        });
    }

    // Debounced resize handler (private)
    const debouncedResize = debounce(adjustAllBoxes, 250);

    // Public API
    return {
        init: function(win) {
            windowContext = win || window;
            $context = windowContext.$ || window.$;
            
            const $ = $context;
            const doc = windowContext.document;
            
            // Initialize immediately if document is already loaded, otherwise wait
            if (doc.readyState === 'loading') {
                $(doc).ready(initializeBoxes);
            } else {
                // Document already loaded, run immediately
                initializeBoxes();
            }
            
            // Handle resize (debounced)
            $(windowContext).on('resize', debouncedResize);
        },
        
        adjust: adjustAllBoxes,
        
        reinit: initializeBoxes
    };
})();

// Expose to window object for external access
if (typeof window !== 'undefined') {
    window.BoxImageAdjust = BoxImageAdjust;
}
