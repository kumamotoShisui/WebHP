import Image from 'next/image'

export default function Conductor() {
    return (
        <section id="conductor" className="section section-light-gray">
            <div className="container">
                <div className="section-header text-center">
                    <span className="section-subtitle">Conductor</span>
                    <h2 className="section-title">指揮者紹介</h2>
                    <div className="section-line"></div>
                </div>
                <div className="conductor-card fade-in-up">
                    <div className="conductor-image-container">
                        <Image
                            src="/images/shikisya.jpg"
                            alt="指揮者 北村直哉"
                            width={400}
                            height={400}
                            className="conductor-image"
                            style={{ objectFit: 'cover', borderRadius: '10px' }}
                        />
                    </div>
                    <div className="conductor-info">
                        <h3 className="conductor-name">
                            常任指揮者 北村直哉
                            <span className="conductor-name-en">Naoya Kitamura</span>
                        </h3>
                        <p className="conductor-bio">
                            ここに指揮者のプロフィールが入ります。経歴や音楽に対する想いなどを記述します。
                            ここに指揮者のプロフィールが入ります。経歴や音楽に対する想いなどを記述します。
                            ここに指揮者のプロフィールが入ります。経歴や音楽に対する想いなどを記述します。
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

