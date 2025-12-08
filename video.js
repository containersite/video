document.querySelector('.thumbFakePlayer').addEventListener('click', function(){
    // থাম্বনেইল লুকানো
    this.style.display = 'none';

    // ভিডিও দেখানো
    var video = document.getElementById('video-id');
    video.style.display = 'block';

    // Fluid Player ইনিশিয়ালাইজ
    fluidPlayer('video-id', {
        layoutControls: {
            controlBar: { autoHideTimeout: 3, animated: true, autoHide: true },
            autoPlay: true,
            playPauseAnimation: true,
            playButtonShowing: true,
            fillToContainer: true,
            posterImage: "/images/thumbnail.png"
        },
        vastOptions: { adList: [], adCTAText: false }
    });

    // অটো-প্লে
    video.play();
});
