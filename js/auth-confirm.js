import {
    supabase
} from "./lucid-store-api.js";


const status =
    document.getElementById(
        "status"
    );


async function confirmEmail() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tokenHash =
            params.get(
                "token_hash"
            );


        const type =
            params.get(
                "type"
            ) || "email";


        if (!tokenHash) {

            throw new Error(
                "The verification link is missing its confirmation token."
            );

        }


        status.textContent =
            "Verifying...";


        const {
            error
        } =
            await supabase.auth.verifyOtp({

                token_hash:
                    tokenHash,

                type

            });


        if (error) {
            throw error;
        }


        const channel =
            new BroadcastChannel(
                "lucid-auth"
            );


        channel.postMessage({
            type: "email-verified"
        });

        channel.close();

        status.className =
            "status success";


        status.innerHTML = `
            <strong>
                Email verified ✓
            </strong>

            <br>

            Your Lucid developer account
            is ready.
        `;


        const button =
            document.createElement(
                "button"
            );


        button.textContent =
            "Return to Lucid Studio";


        button.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/";

            }
        );


        document
            .querySelector(
                ".verification"
            )
            .appendChild(
                button
            );


        } catch (error) {

            console.error(
                "Lucid email verification:",
                error
            );


            status.className =
                "status error";


            status.textContent =
                "This verification link is invalid or has expired.";

    }

}


confirmEmail();
