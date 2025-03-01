$(function() {
    // popup video
    $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
        disableOn: 700,
        type: 'iframe',
        mainClass: 'mfp-fade',
        removalDelay: 160,
        preloader: false,
        fixedContentPos: false
    });
    // Add scrollspy to <body>
    $('body').scrollspy({
        target: "#myScrollspy",
        offset: 50
    });
    // Add smooth scrolling on all links inside the navbar
    $(".onepage-pagination a").on('click', function(event) {
        // Make sure this.hash has a value before overriding default behavior
        if (this.hash !== "") {
            // Prevent default anchor click behavior
            event.preventDefault();
            // Store hash
            var hash = this.hash;
            //$(".onepage-pagination a").removeClass('active');
            $(this).parent().fadeOut().fadeIn();
            //$(this).addClass('active');
            //console.log(this);
            // Using jQuery's animate() method to add smooth page scroll
            // The optional number (800) specifies the number of milliseconds it takes to scroll to the specified area
            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 800, function() {
                // Add hash (#) to URL when done scrolling (default click behavior)
                window.location.hash = hash;
            });
        } // End if
    });
    // -------------------------------------------------------------
    // Back To Top
    // -------------------------------------------------------------
    $(window).scroll(function() {
        if ($(this).scrollTop() > 100) {
            $('.scroll-up').fadeIn();
        } else {
            $('.scroll-up').fadeOut();
        }
    });
    //Click event to scroll to top
    $('.scroll-up').click(function() {
        $('html, body').animate({
            scrollTop: 0
        }, 800);
        return false;
    });
    //subscribe
    $('.subform').submit(function(e) {
        e.preventDefault();
        var form = $(this);
        $.ajax({
            type: 'POST',
            url: 'http://localhost/b2w/Subscribe.php',
            data: form.serialize(),
            success: function(results) {
                form.find(".mc4wp-response").html(results);
            },
            error: function() {
                alert('An error has occurred please try again');
            }
        });
    });
    // Cache the Window object
    var $window = $(window);
    // Parallax Backgrounds
    // Tutorial: http://code.tutsplus.com/tutorials/a-simple-parallax-scrolling-technique--net-27641
    $('section[data-type="background"]').each(function() {
        var $bgobj = $(this); // assigning the object
        $window.scroll(function() {
            // Scroll the background at var speed
            // the yPos is a negative value because we're scrolling it UP!                              
            var yPos = -($window.scrollTop() / $bgobj.data('speed'));
            // Put together our final background position
            var coords = '50% ' + yPos + 'px';
            // Move the background
            $bgobj.css({
                backgroundPosition: coords
            });
        }); // end window scroll
    });
});

//WebPJS - Google's new image format WebP for not supported browsers (with alpha-channel) http://webpjs.appspot.com/
(function() {
    var WebP = new Image();
    WebP.onload = WebP.onerror = function() {
        if (WebP.height != 2) {
			srcimage = 'http://localhost/b2w/wp-content/themes/bootstrap2wordpress/assets/img/';
			$('#hero').css('background','url('+srcimage+'bg-top.jpg) 50% 0 repeat fixed');
			$('#videosection').css('background','url('+srcimage+'video-bg.jpg) no-repeat center center')
			.css('background-size','cover');
			$('#signup').css('background','url('+srcimage+'bg-bottom.jpg) no-repeat center bottom');
			$('#instructor').css('background','#fff url('+srcimage+'Mohcine-NAZRHAN-Face.png) 25% bottom no-repeat');
			$('#mn-logowhite').attr("src",''+srcimage+'mn-logowhite.png');
			$('#mn-logo').attr("src",''+srcimage+'mn-logo.png');
        }
    };
    WebP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
})();