// Enhanced logout debugging script v2
document.addEventListener('DOMContentLoaded', function() {
    console.log('⬇️ Logout debug script started ⬇️');
    
    // Find all logout forms in the document
    const logoutForms = document.querySelectorAll('form[action="/logout"]');
    
    if (logoutForms.length > 0) {
        console.log(`✅ Found ${logoutForms.length} logout form(s)`);
        
        // Log details for each form
        logoutForms.forEach((form, index) => {
            console.log(`Form #${index} details:`, {
                id: form.id || '(no id)',
                action: form.getAttribute('action'),
                method: form.getAttribute('method'),
                elements: form.elements.length
            });
            
            // Add a submit event listener to each form
            form.addEventListener('submit', function(e) {
                const timestamp = new Date().toISOString();
                console.log(`🔔 [${timestamp}] Form #${index} submit event triggered`);
                
                console.log('📤 Sending logout request...');
                
                // Option 1: Let the form submit naturally with monitoring
                const useNativeSubmission = true; // Change to false to use fetch approach
                
                if (useNativeSubmission) {
                    // Just log and let the normal form submission happen
                    console.log('✅ Using native form submission');
                    
                    // Add a timestamp parameter to avoid caching
                    const timestamp = Date.now();
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = '_t';
                    hiddenInput.value = timestamp;
                    form.appendChild(hiddenInput);
                    
                    // Let the form submit naturally
                    console.log('🔄 Form submitting naturally...');
                    // Don't call e.preventDefault() to allow normal form submission
                    
                    // Add timeout to catch page not changing
                    setTimeout(() => {
                        console.log('⚠️ Page still here after 3 seconds - redirect may have failed');
                        window.location.href = '/?timeout=true'; 
                    }, 3000);
                    
                    return; // Let the normal form submission continue
                }
                
                // Option 2: Use fetch for detailed logging (only if useNativeSubmission is false)
                e.preventDefault(); // Prevent default only when using fetch
                
                console.log('📤 Using fetch for detailed tracking...');
                
                // Create a fetch request to manually handle logout with timestamp for cache busting
                fetch(`/logout?_t=${Date.now()}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    },
                    credentials: 'same-origin'
                })
                .then(response => {
                    console.log('📥 Logout response received:', {
                        status: response.status,
                        statusText: response.statusText,
                        redirected: response.redirected,
                        redirectUrl: response.redirected ? response.url : '(none)',
                        headers: {
                            'content-type': response.headers.get('content-type'),
                            'cache-control': response.headers.get('cache-control')
                        }
                    });
                    
                    if (response.redirected) {
                        console.log('🔄 Manually redirecting to:', response.url);
                        window.location.href = response.url;
                    } else if (response.ok) {
                        console.log('✅ Logout successful but no redirect. Manually returning to home.');
                        window.location.href = '/';
                    } else {
                        console.error('❌ Logout failed with status:', response.status);
                    }
                })
                .catch(error => {
                    console.error('❌ Logout request error:', error);
                    // If fetch fails, try a standard redirect
                    console.log('⚠️ Falling back to direct page navigation');
                    window.location.href = '/';
                });
            });
        });
    } else {
        console.error('❌ No logout forms found!');
        
        // Search for any form elements for debugging
        const allForms = document.querySelectorAll('form');
        console.log(`Found ${allForms.length} other form(s) on page:`);
        
        allForms.forEach((form, i) => {
            console.log(`Other form #${i}:`, { 
                id: form.id || '(no id)', 
                action: form.action, 
                method: form.method 
            });
        });
    }
    
    // Also check for non-form logout links that might be present
    const logoutLinks = document.querySelectorAll('a[href="/logout"]');
    if (logoutLinks.length > 0) {
        console.log(`⚠️ Found ${logoutLinks.length} direct logout link(s) - these should be converted to forms`);
    }
    
    console.log('⬆️ Logout debug script finished ⬆️');
});
