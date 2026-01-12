//==========> this is for domain referral
// import { useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";

// export default function ReferralRedirect() {
//   const { code } = useParams();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (code) {
//       localStorage.setItem("referral_code", code);
//     }
//     navigate("/register");
//   }, [code, navigate]);

//   return null;
// }

//============> this is for localhost link as we are tesing comment this after buying donain and uncomment above code
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem("referral_code", code);
    }
    navigate("/register");
  }, [code, navigate]);

  return null;
}
