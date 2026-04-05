const page = document.body.dataset.page || "home";
const byId = (id) => document.getElementById(id);
const on = (el, eventName, handler) => el && el.addEventListener(eventName, handler);

const state = {
  language: localStorage.getItem("diaryLanguage") || "vi",
  currentScreen: "dashboard-home",
  token: localStorage.getItem("diaryToken") || "",
  user: JSON.parse(localStorage.getItem("diaryUser") || "null"),
  notes: [],
  trash: [],
  sharedByMe: [],
  sharedWithMe: [],
  selectedNoteId: null,
  selectedSharedNoteId: "",
  pendingId: sessionStorage.getItem("pendingId") || "",
  authFlow: sessionStorage.getItem("authFlow") || "register",
  forgotPasswordRequestId: sessionStorage.getItem("forgotPasswordRequestId") || "",
  recoveryRequestId: sessionStorage.getItem("recoveryRequestId") || "",
  tempPassword: sessionStorage.getItem("tempPassword") || "",
  personalKey: sessionStorage.getItem("personalKey") || "",
  notesUnlocked: false,
  personalKeyRequestId: "",
  profileAccessRequestId: "",
  passwordRequestId: "",
  accountDeletionRequestId: "",
  profileAccessUnlocked: false,
  sharedPayload: null,
  hasAuthenticatedInSession: sessionStorage.getItem("diaryAuthenticatedThisSession") === "true",
};

if (!window.CryptoJS) throw new Error("CryptoJS failed to load. Check your internet connection or CDN access.");

const translations = {
  vi: {
    nav: { home: "Trang chủ", intro: "Giới thiệu", about: "Về chúng tôi", login: "Đăng nhập" },
    public: {
      homeKicker: "Personal diary space",
      homeTitle: "BloomNote",
      homeText: "Không gian nhật ký riêng tư với cảm giác nhẹ nhàng, tập trung và an toàn hơn cho những điều bạn muốn giữ lại.",
      heroAbout: "Khám phá thêm",
      heroLogin: "Mở khu đăng nhập",
      featureHome: "Bạn có thể viết nhật ký mỗi ngày, lưu lại cảm xúc riêng tư và quay lại đọc bằng khóa cá nhân bất cứ khi nào cần.",
      featureEncryption: "Nội dung được mã hóa AES trước khi lưu và sẽ không hiện rõ nếu bạn chưa mở khóa.",
      featureOtp: "Đăng ký bằng OTP email để kích hoạt tài khoản và bảo vệ luồng đăng nhập tốt hơn.",
      tags: ["Mã hóa AES", "OTP qua email", "Nhật ký cá nhân"],
      introKicker: "Giới thiệu",
      introTitle: "Một website nhật ký cá nhân gọn gàng, ấm áp và an toàn.",
      introCards: [
        { title: "Viết và lưu mỗi ngày", text: "Trình soạn thảo cho phép bạn ghi nhanh suy nghĩ, chỉnh kiểu chữ cơ bản và sắp xếp lại nhật ký theo cách đơn giản." },
        { title: "Bảo mật trước khi hiển thị", text: "Danh sách nhật ký đang hoạt động cũng giữ nội dung ở dạng mã hóa. Chỉ khi bạn chủ động mở khóa, nội dung mới được giải mã để xem và sửa." },
        { title: "Rõ ràng cho người dùng", text: "Trang chủ, giới thiệu, về chúng tôi và khu đăng nhập được tách mạch lạc nhưng vẫn nằm trong cùng một trải nghiệm liền mạch." },
      ],
      aboutKicker: "Về chúng tôi",
      aboutTitle: "BloomNote được làm ra để việc viết riêng tư trở nên dễ chịu hơn.",
      aboutText: "Mục tiêu của website là tạo ra một nơi vừa đẹp mắt vừa thực tế để bạn cất giữ câu chuyện cá nhân. Từ phần giới thiệu, đăng nhập đến bảng điều khiển đều được thiết kế để người dùng cảm thấy nhẹ nhàng, dễ dùng và an tâm hơn khi lưu dữ liệu riêng tư.",
      aboutStats: [
        "Tập trung vào cảm giác đọc tiếng Việt rõ ràng, dễ nhìn.",
        "Giữ nội dung ghi chú ở dạng mã hóa cho tới khi được mở khóa.",
        "Tách khu đăng nhập riêng nhưng vẫn giữ tinh thần của landing page.",
      ],
    },
    auth: {
      kicker: "Đăng nhập an toàn",
      title: "Bước vào khu nhật ký riêng với cùng cảm giác dịu dàng như trang chủ.",
      text: "Tại đây bạn vẫn thấy tinh thần của BloomNote, nhưng phần chính sẽ tập trung cho đăng nhập, đăng ký và xác thực OTP.",
      backHome: "Về trang chủ",
      loginHeading: "Chào mừng bạn quay lại",
      loginIdentifierLabel: "Email / Tên người dùng",
      loginPasswordLabel: "Mật khẩu",
      loginSubmit: "Đăng nhập",
      forgotPassword: "Quên mật khẩu",
      registerPrompt: "Chưa có tài khoản?",
      goRegister: "Đăng ký",
      registerHeading: "Tạo tài khoản mới",
      registerUsernameLabel: "Tên người dùng",
      registerEmailLabel: "Email",
      registerPasswordLabel: "Mật khẩu",
      registerSubmit: "Gửi OTP",
      loginPrompt: "Đã có tài khoản?",
      goLogin: "Đăng nhập",
      otpHeading: "Xác thực OTP",
      otpText: "Nhập mã OTP đã được gửi về email của bạn.",
      forgotOtpHeading: "Xác thực OTP đặt lại mật khẩu",
      forgotOtpText: "Nhập OTP từ email, sau đó chọn mật khẩu mới.",
      forgotNewPasswordLabel: "Mật khẩu mới",
      otpSubmit: "Xác nhận",
      otpResend: "Gửi lại OTP",
      tags: ["Trang riêng cho đăng nhập", "Giữ cảm giác landing page", "Liền mạch với trang chủ"],
      toggleShow: "Hiện",
      toggleHide: "Ẩn",
    },
    dashboard: {
      screens: {
        "dashboard-home": ["Tổng quan", "Quản lý nhật ký an toàn và riêng tư."],
        notes: ["Nhật ký", "Danh sách giữ nội dung ở dạng mã hóa cho đến khi bạn mở khóa."],
        "shared-notes": ["Nhật ký được chia sẻ", "Quản lý quyền xem, quyền sửa và các nhật ký người khác gửi cho bạn."],
        trash: ["Thùng rác", "Nhật ký đã xóa vẫn được giữ mã hóa trước khi bị xóa hẳn."],
        profile: ["Thông tin cá nhân", "Cập nhật hồ sơ và khóa cá nhân dùng để giải mã."],
        "share-view": ["Ghi chú được chia sẻ", "Xem bản ghi mã hóa mà bạn đã gửi đi."],
      },
      notesLocked: "Đã khóa",
      notesUnlocked: "Đã mở khóa",
      lockedHint: "Nhật ký đang hoạt động hiện chỉ hiển thị nội dung đã mã hóa. Hãy nhấn mở khóa để xem nội dung thật.",
      unlockedHint: "Bạn đã mở khóa thành công. Giờ có thể đọc, chọn và chỉnh sửa nhật ký đã mã hóa.",
      unlockButton: "Mở khóa nhật ký",
      lockButton: "Ẩn nội dung",
      lockedBadge: "Đang mã hóa",
      unlockedBadge: "Đã giải mã",
      emptyNotes: "Chưa có nhật ký nào ở đây.",
      emptyTrash: "Thùng rác đang trống.",
      openLabel: "Mở",
      deleteLabel: "Xóa",
      restoreLabel: "Khôi phục",
      permanentDeleteLabel: "Xóa vĩnh viễn",
    },
    toasts: {
      loginSuccess: "Đăng nhập thành công.",
      registerOtp: "OTP đã được gửi về email.",
      resendOtp: "Đã gửi lại OTP.",
      registerSuccess: "Đăng ký thành công. Vui lòng đăng nhập.",
      forgotOtpSent: "OTP đặt lại mật khẩu đã được gửi về email.",
      forgotSuccess: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.",
      needForgotPassword: "Bạn cần nhập mật khẩu mới.",
      movedToTrash: "Đã chuyển nhật ký vào thùng rác.",
      restored: "Đã khôi phục nhật ký.",
      permanentlyDeleted: "Đã xóa vĩnh viễn nhật ký.",
      saved: "Đã lưu nhật ký dưới dạng mã hóa.",
      profileSaved: "Đã cập nhật thông tin cá nhân.",
      unlockSuccess: "Đã mở khóa nội dung nhật ký.",
      lockSuccess: "Đã ẩn nội dung nhật ký đang hoạt động.",
      needFields: "Vui lòng nhập tiêu đề và nội dung.",
      needKey: "Cần nhập khóa cá nhân hoặc đăng nhập lại để mã hóa nội dung.",
      needUnlock: "Hãy mở khóa nhật ký trước khi xem hoặc chỉnh sửa nội dung cũ.",
      shareCreated: "Đã tạo link chia sẻ và copy thông tin.",
      shareRemoved: "Đã xóa nhật ký chia sẻ khỏi danh sách của bạn.",
      shareStopped: "Đã ngừng chia sẻ nhật ký này.",
      shareUpdated: "Đã cập nhật quyền chia sẻ.",
      shareSaved: "Đã lưu thay đổi trên nhật ký được chia sẻ.",
      needRecipient: "Bạn cần nhập tài khoản người nhận khi cho phép chỉnh sửa.",
      switchAccount: "Hãy đăng nhập tài khoản khác.",
      logout: "Đã đăng xuất.",
      sharedLoadError: "Không tải được ghi chú chia sẻ.",
      noNoteToShare: "Hãy mở một nhật ký trước khi chia sẻ.",
      keyPrompt: "Nhập khóa cá nhân để giải mã nhật ký:",
      sharePrompt: "Nhập khóa kiểm thử để gửi kèm:",
      needShareKey: "Bạn cần nhập khóa kiểm thử để tạo link chia sẻ.",
      forgotPrompt: "Nhập email tài khoản:",
      forgotNewPasswordPrompt: "Nhập mật khẩu mới:",
      unlockRequiredForExisting: "Nhật ký cũ đang được giữ ở dạng mã hóa. Mở khóa trước để xem nội dung thật.",
      invalidKey: "Khóa cá nhân không đúng.",
      personalKeyOtpSent: "OTP đổi khóa cá nhân đã được gửi về email.",
      personalKeyUpdated: "Đã đổi khóa cá nhân và mã hóa lại note thành công.",
      needCurrentPersonalKey: "Bạn cần nhập khóa cá nhân hiện tại.",
      needNewPersonalKey: "Bạn cần nhập khóa cá nhân mới.",
      needCurrentPassword: "Bạn cần nhập mật khẩu hiện tại.",
      needOtp: "Bạn cần nhập OTP xác nhận đổi khóa.",
      needUnlockBeforeChange: "Hãy mở khóa toàn bộ note hiện tại trước khi đổi khóa cá nhân.",
      needUnlockBeforePasswordChange: "Hãy mở khóa toàn bộ note hiện tại trước khi đổi mật khẩu.",
      passwordChangeReencryptFailed: "Không thể đồng bộ note sang mật khẩu mới. Hãy mở khóa lại note hiện tại và thử lại.",
      sharedUnlockFailed: "Khóa kiểm thử không đúng hoặc nội dung không thể giải mã.",
      sharedUnlockSuccess: "Đã mở ghi chú được chia sẻ.",
      shareInfo: "Mỗi lần chia sẻ sẽ tạo một link mới và yêu cầu một khóa kiểm thử mới.",
      encryptedTitle: "Ghi chú đang mã hóa",
      searchPlaceholder: "Tìm theo tiêu đề sau khi mở khóa...",
      needProfileKey: "Bạn cần nhập khóa cá nhân để mở hồ sơ.",
      profileAccessOtpSent: "OTP mở hồ sơ đã được gửi về email.",
      profileAccessGranted: "Đã mở trang thông tin cá nhân.",
      recoveryOtpSent: "OTP cấp lại khóa đã được gửi về email.",
      recoverySuccess: "Đã cấp lại khóa và đổi mật khẩu mới thành công.",
      passwordOtpSent: "OTP đổi mật khẩu đã được gửi về email.",
      passwordUpdated: "Đã đổi mật khẩu đăng nhập thành công.",
      accountDeleteOtpSent: "OTP xóa tài khoản đã được gửi về email.",
      accountDeleted: "Tài khoản đã được đưa vào thùng rác 30 ngày.",
      needDeleteFields: "Bạn cần nhập mật khẩu hiện tại, khóa cá nhân hiện tại và OTP.",
      needPasswordFields: "Bạn cần nhập mật khẩu mới và OTP.",
      apiJsonError: "API trả về dữ liệu không hợp lệ. Vui lòng thử lại.",
    },
  },
  en: {
    nav: { home: "Home", intro: "Introduction", about: "About", login: "Login" },
    public: {
      homeKicker: "Personal diary space",
      homeTitle: "BloomNote",
      homeText: "A private diary space with a calmer atmosphere for writing, keeping, and protecting your personal thoughts.",
      heroAbout: "Explore more",
      heroLogin: "Open login area",
      featureHome: "Write daily reflections, manage private notes, and come back to them anytime with your personal key.",
      featureEncryption: "Entries are encrypted with AES before saving and stay unreadable until you unlock them.",
      featureOtp: "Email OTP registration helps activate accounts and adds a safer sign-in flow.",
      tags: ["AES encryption", "Email OTP", "Private notes"],
      introKicker: "Introduction",
      introTitle: "A personal diary website that feels warm, tidy, and secure.",
      introCards: [
        { title: "Write and save every day", text: "The editor lets you capture thoughts quickly, use basic formatting, and keep your journal simple to manage." },
        { title: "Protected before reveal", text: "Active diary entries also stay encrypted in the list. Only an explicit unlock reveals readable content for viewing or editing." },
        { title: "Clear for users", text: "Home, introduction, about, and login are separated cleanly while still feeling like one continuous product experience." },
      ],
      aboutKicker: "About us",
      aboutTitle: "BloomNote was built to make private writing feel calmer.",
      aboutText: "The website aims to give you a place that is both beautiful and practical for personal stories. From the landing sections to the login area and dashboard, everything is shaped to feel softer, easier, and safer.",
      aboutStats: [
        "Focused on clear, comfortable reading.",
        "Keeps diary content encrypted until you unlock it.",
        "Separates the login area while preserving the landing-page feeling.",
      ],
    },
    auth: {
      kicker: "Secure login",
      title: "Step into your private diary with the same atmosphere as the home page.",
      text: "This view keeps BloomNote's identity while focusing on sign in, sign up, and OTP verification.",
      backHome: "Back to home",
      loginHeading: "Welcome back",
      loginIdentifierLabel: "Email / Username",
      loginPasswordLabel: "Password",
      loginSubmit: "Login",
      forgotPassword: "Forgot password",
      registerPrompt: "No account yet?",
      goRegister: "Register",
      registerHeading: "Create a new account",
      registerUsernameLabel: "Username",
      registerEmailLabel: "Email",
      registerPasswordLabel: "Password",
      registerSubmit: "Send OTP",
      loginPrompt: "Already have an account?",
      goLogin: "Login",
      otpHeading: "OTP verification",
      otpText: "Enter the OTP that was sent to your email.",
      forgotOtpHeading: "Reset password OTP",
      forgotOtpText: "Enter the OTP from your email, then choose a new password.",
      forgotNewPasswordLabel: "New password",
      otpSubmit: "Confirm",
      otpResend: "Resend OTP",
      tags: ["Dedicated login view", "Keeps landing-page vibe", "Smooth product flow"],
      toggleShow: "Show",
      toggleHide: "Hide",
    },
    dashboard: {
      screens: {
        "dashboard-home": ["Overview", "Manage your diary in a private and secure way."],
        notes: ["Diary", "Entries stay encrypted until you choose to unlock them."],
        "shared-notes": ["Shared diary", "Manage access permissions and notes shared with you."],
        trash: ["Trash", "Deleted entries remain encrypted before permanent cleanup."],
        profile: ["Profile", "Update your profile and personal decryption key."],
        "share-view": ["Shared note", "View the encrypted note you shared."],
      },
      notesLocked: "Locked",
      notesUnlocked: "Unlocked",
      lockedHint: "Active entries currently show encrypted content only. Unlock them when you want to read the real text.",
      unlockedHint: "Entries are unlocked now. You can read, open, and edit decrypted content.",
      unlockButton: "Unlock diary",
      lockButton: "Hide content",
      lockedBadge: "Encrypted",
      unlockedBadge: "Decrypted",
      emptyNotes: "No diary entries yet.",
      emptyTrash: "Trash is empty.",
      openLabel: "Open",
      deleteLabel: "Delete",
      restoreLabel: "Restore",
      permanentDeleteLabel: "Delete forever",
    },
    toasts: {
      loginSuccess: "Logged in successfully.",
      registerOtp: "OTP sent to your email.",
      resendOtp: "OTP resent successfully.",
      registerSuccess: "Registration complete. Please log in.",
      forgotOtpSent: "The password reset OTP has been sent to your email.",
      forgotSuccess: "Password reset successfully. Please log in.",
      needForgotPassword: "You need to enter a new password.",
      movedToTrash: "Moved the entry to trash.",
      restored: "Restored the entry.",
      permanentlyDeleted: "Deleted the entry permanently.",
      saved: "Saved the diary entry in encrypted form.",
      profileSaved: "Profile updated successfully.",
      unlockSuccess: "Diary content unlocked.",
      lockSuccess: "Active diary content hidden again.",
      needFields: "Please enter both title and content.",
      needKey: "A personal key or a fresh login is required to encrypt content.",
      needUnlock: "Unlock the diary before viewing or editing older entries.",
      shareCreated: "Share link created and copied.",
      shareRemoved: "The shared note was removed from your list.",
      shareStopped: "Sharing for this note has been stopped.",
      shareUpdated: "Share access updated.",
      shareSaved: "Shared note changes saved.",
      needRecipient: "A recipient account is required for edit access.",
      switchAccount: "Please sign in to a different account.",
      logout: "Logged out.",
      sharedLoadError: "Unable to load the shared note.",
      noNoteToShare: "Open a diary entry before sharing it.",
      keyPrompt: "Enter your personal key to decrypt diary entries:",
      sharePrompt: "Enter the test key to include:",
      needShareKey: "Enter a test key before creating a share link.",
      forgotPrompt: "Enter your account email:",
      forgotNewPasswordPrompt: "Enter your new password:",
      unlockRequiredForExisting: "Existing diary entries remain encrypted until you unlock them.",
      invalidKey: "The personal key is incorrect.",
      personalKeyOtpSent: "The personal key OTP has been sent to your email.",
      personalKeyUpdated: "The personal key was updated and notes were re-encrypted successfully.",
      needCurrentPersonalKey: "You need to enter your current personal key.",
      needNewPersonalKey: "You need to enter a new personal key.",
      needCurrentPassword: "You need to enter your current password.",
      needOtp: "You need to enter the OTP confirmation code.",
      needUnlockBeforeChange: "Unlock your current notes before changing the personal key.",
      needUnlockBeforePasswordChange: "Unlock your current notes before changing the password.",
      passwordChangeReencryptFailed: "Current notes could not be synced to the new password. Unlock them again and try once more.",
      sharedUnlockFailed: "The test key is incorrect or the content could not be decrypted.",
      sharedUnlockSuccess: "The shared note has been unlocked.",
      shareInfo: "Each share generates a new link and requires a new test key.",
      encryptedTitle: "Encrypted note",
      searchPlaceholder: "Search titles after unlocking...",
      needProfileKey: "You need to enter the personal key to open the profile.",
      profileAccessOtpSent: "The profile access OTP has been sent to your email.",
      profileAccessGranted: "The profile page is now unlocked.",
      recoveryOtpSent: "The recovery OTP has been sent to your email.",
      recoverySuccess: "Your key was reissued and password updated successfully.",
      passwordOtpSent: "The password change OTP has been sent to your email.",
      passwordUpdated: "The login password has been updated successfully.",
      accountDeleteOtpSent: "The account deletion OTP has been sent to your email.",
      accountDeleted: "The account has been moved to trash for 30 days.",
      needDeleteFields: "Enter your current password, current personal key, and OTP.",
      needPasswordFields: "Enter the new password and OTP.",
      apiJsonError: "The API returned an invalid response. Please try again.",
    },
  },
};

const els = {
  navButtons: Array.from(document.querySelectorAll(".nav-btn[data-section]")),
  brandHome: byId("brand-home"),
  navLogin: byId("nav-login"),
  languageToggle: byId("language-toggle"),
  heroAbout: byId("hero-about"),
  heroLogin: byId("hero-login"),
  authBackHome: byId("auth-back-home"),
  homeKicker: byId("home-kicker"),
  homeTitle: byId("home-title"),
  homeText: byId("home-text"),
  heroTags: byId("hero-tags"),
  featureHomeCopy: byId("feature-home-copy"),
  featureEncryption: byId("feature-encryption"),
  featureOtp: byId("feature-otp"),
  introKicker: byId("intro-kicker"),
  introTitle: byId("intro-title"),
  introCardTitle1: byId("intro-card-title-1"),
  introCardText1: byId("intro-card-text-1"),
  introCardTitle2: byId("intro-card-title-2"),
  introCardText2: byId("intro-card-text-2"),
  introCardTitle3: byId("intro-card-title-3"),
  introCardText3: byId("intro-card-text-3"),
  aboutKicker: byId("about-kicker"),
  aboutTitle: byId("about-title"),
  aboutText: byId("about-text"),
  aboutStat1: byId("about-stat-1"),
  aboutStat2: byId("about-stat-2"),
  aboutStat3: byId("about-stat-3"),
  authKicker: byId("auth-kicker"),
  authTitle: byId("auth-title"),
  authText: byId("auth-text"),
  authTags: byId("auth-tags"),
  loginCard: byId("login-card"),
  registerCard: byId("register-card"),
  otpCard: byId("otp-card"),
  loginHeading: byId("login-heading"),
  loginIdentifierLabel: byId("login-identifier-label"),
  loginPasswordLabel: byId("login-password-label"),
  loginIdentifier: byId("login-identifier"),
  loginPassword: byId("login-password"),
  togglePassword: byId("toggle-password"),
  loginSubmit: byId("login-submit"),
  forgotPassword: byId("forgot-password"),
  registerPrompt: byId("register-prompt"),
  goRegister: byId("go-register"),
  registerHeading: byId("register-heading"),
  registerUsernameLabel: byId("register-username-label"),
  registerEmailLabel: byId("register-email-label"),
  registerPasswordLabel: byId("register-password-label"),
  registerUsername: byId("register-username"),
  registerEmail: byId("register-email"),
  registerPassword: byId("register-password"),
  registerSubmit: byId("register-submit"),
  loginPrompt: byId("login-prompt"),
  goLogin: byId("go-login"),
  otpHeading: byId("otp-heading"),
  otpText: byId("otp-text"),
  otpCode: byId("otp-code"),
  otpNewPasswordField: byId("otp-new-password-field"),
  otpNewPasswordLabel: byId("otp-new-password-label"),
  otpNewPassword: byId("otp-new-password"),
  otpResend: byId("otp-resend"),
  otpSubmit: byId("otp-submit"),
  sideButtons: Array.from(document.querySelectorAll(".side-btn")),
  screens: Array.from(document.querySelectorAll(".screen")),
  screenTitle: byId("screen-title"),
  screenSubtitle: byId("screen-subtitle"),
  userDropdownTrigger: byId("user-dropdown-trigger"),
  userDropdown: byId("user-dropdown"),
  dropdownActions: Array.from(document.querySelectorAll("[data-profile-action]")),
  activeCount: byId("active-count"),
  trashCount: byId("trash-count"),
  keyStatus: byId("key-status"),
  noteSearch: byId("note-search"),
  unlockNotes: byId("unlock-notes"),
  notesSecurityHint: byId("notes-security-hint"),
  notesList: byId("notes-list"),
  trashList: byId("trash-list"),
  noteTitle: byId("note-title"),
  noteEditor: byId("note-editor"),
  saveNote: byId("save-note"),
  shareNote: byId("share-note"),
  fab: byId("create-note-fab"),
  shareLinkPanel: byId("share-link-panel"),
  shareAccessMode: byId("share-access-mode"),
  shareRecipientField: byId("share-recipient-field"),
  shareRecipient: byId("share-recipient"),
  shareLinkOutput: byId("share-link-output"),
  copyShareLink: byId("copy-share-link"),
  shareStatus: byId("share-status"),
  sharedWithMeList: byId("shared-with-me-list"),
  sharedByMeList: byId("shared-by-me-list"),
  profileDisplayName: byId("profile-display-name"),
  profileUsername: byId("profile-username"),
  profileBirthDate: byId("profile-birth-date"),
  profileEmail: byId("profile-email"),
  profileGender: byId("profile-gender"),
  profileNewPersonalKey: byId("profile-new-personal-key"),
  profilePersonalKeyOtp: byId("profile-personal-key-otp"),
  saveProfile: byId("save-profile"),
  openSecurityPanel: byId("open-security-panel"),
  requestPersonalKeyOtp: byId("request-personal-key-otp"),
  confirmPersonalKey: byId("confirm-personal-key"),
  profileAccessModal: byId("profile-access-modal"),
  profileAccessKey: byId("profile-access-key"),
  profileAccessSubmit: byId("profile-access-submit"),
  profileAccessForgot: byId("profile-access-forgot"),
  profileAccessClose: byId("profile-access-close"),
  profileOtpModal: byId("profile-otp-modal"),
  profileAccessOtp: byId("profile-access-otp"),
  profileOtpSubmit: byId("profile-otp-submit"),
  profileOtpClose: byId("profile-otp-close"),
  recoveryModal: byId("recovery-modal"),
  recoveryOtp: byId("recovery-otp"),
  recoveryNewPassword: byId("recovery-new-password"),
  recoverySubmit: byId("recovery-submit"),
  recoveryClose: byId("recovery-close"),
  securityModal: byId("security-modal"),
  securityOptionPassword: byId("security-option-password"),
  securityOptionKey: byId("security-option-key"),
  securityOptionDelete: byId("security-option-delete"),
  securityPasswordModal: byId("security-password-modal"),
  securityCurrentPassword: byId("security-current-password"),
  securityNewPassword: byId("security-new-password"),
  securityPasswordOtp: byId("security-password-otp"),
  securityPasswordRequest: byId("security-password-request"),
  securityPasswordConfirm: byId("security-password-confirm"),
  securityPasswordClose: byId("security-password-close"),
  securityClose: byId("security-close"),
  personalKeyModal: byId("personal-key-modal"),
  profileCurrentPersonalKey: byId("profile-current-personal-key"),
  profileCurrentPassword: byId("profile-current-password"),
  personalKeyClose: byId("personal-key-close"),
  deleteAccountModal: byId("delete-account-modal"),
  deleteAccountPassword: byId("delete-account-password"),
  deleteAccountPersonalKey: byId("delete-account-personal-key"),
  deleteAccountOtp: byId("delete-account-otp"),
  deleteAccountRequest: byId("delete-account-request"),
  deleteAccountConfirm: byId("delete-account-confirm"),
  deleteAccountClose: byId("delete-account-close"),
  deleteAccountConfirmModal: byId("delete-account-confirm-modal"),
  deleteAccountFinalConfirm: byId("delete-account-final-confirm"),
  deleteAccountFinalClose: byId("delete-account-final-close"),
  notesUnlockModal: byId("notes-unlock-modal"),
  notesUnlockKey: byId("notes-unlock-key"),
  notesUnlockConfirm: byId("notes-unlock-confirm"),
  notesUnlockClose: byId("notes-unlock-close"),
  shareKeyModal: byId("share-key-modal"),
  shareTestKey: byId("share-test-key"),
  shareKeyConfirm: byId("share-key-confirm"),
  shareKeyClose: byId("share-key-close"),
  toast: byId("toast"),
  sharedNoteTitle: byId("shared-note-title"),
  sharedNoteTitleInput: byId("shared-note-title-input"),
  sharedNoteKey: byId("shared-note-key"),
  sharedNoteAccessKey: byId("shared-note-access-key"),
  sharedNoteUnlock: byId("shared-note-unlock"),
  sharedNoteSave: byId("shared-note-save"),
  sharedNoteContent: byId("shared-note-content"),
};

function t() { return translations[state.language]; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast && els.toast.classList.add("hidden"), 2500);
}
function renderTagList(container, items) { if (container) container.innerHTML = items.map((item) => `<span>${escapeHtml(item)}</span>`).join(""); }
function goToHome(section = "") { window.location.href = `/index.html${section ? `#${section}` : ""}`; }
function goToLogin() { window.location.href = "/login.html"; }
function goToDashboard(hash = "") { window.location.href = `/dashboard.html${hash}`; }

function renderOtpCardContent() {
  if (!els.otpHeading || !els.otpText) return;
  const copy = t().auth;
  const forgot = state.authFlow === "forgot";
  els.otpHeading.textContent = forgot ? copy.forgotOtpHeading : copy.otpHeading;
  els.otpText.textContent = forgot ? copy.forgotOtpText : copy.otpText;
  if (els.otpResend) {
    els.otpResend.textContent = copy.otpResend;
    els.otpResend.classList.toggle("hidden", forgot);
  }
  if (els.otpNewPasswordField) els.otpNewPasswordField.classList.toggle("hidden", !forgot);
  if (els.otpNewPasswordLabel) els.otpNewPasswordLabel.textContent = copy.forgotNewPasswordLabel;
  if (els.otpNewPassword) {
    if (!forgot) els.otpNewPassword.value = "";
    els.otpNewPassword.required = forgot;
  }
}

function renderMarketingContent() {
  const copy = t();
  document.documentElement.lang = state.language;
  localStorage.setItem("diaryLanguage", state.language);
  if (els.languageToggle) els.languageToggle.textContent = state.language === "vi" ? "EN" : "VN";
  if (els.navButtons.length >= 3) {
    els.navButtons[0].textContent = copy.nav.home;
    els.navButtons[1].textContent = copy.nav.intro;
    els.navButtons[2].textContent = copy.nav.about;
  }
  if (els.navLogin) els.navLogin.textContent = copy.nav.login;
  if (els.homeKicker) els.homeKicker.textContent = copy.public.homeKicker;
  if (els.homeTitle) els.homeTitle.textContent = copy.public.homeTitle;
  if (els.homeText) els.homeText.textContent = copy.public.homeText;
  if (els.heroAbout) els.heroAbout.textContent = copy.public.heroAbout;
  if (els.heroLogin) els.heroLogin.textContent = copy.public.heroLogin;
  if (els.featureHomeCopy) els.featureHomeCopy.textContent = copy.public.featureHome;
  if (els.featureEncryption) els.featureEncryption.textContent = copy.public.featureEncryption;
  if (els.featureOtp) els.featureOtp.textContent = copy.public.featureOtp;
  if (els.heroTags) renderTagList(els.heroTags, copy.public.tags);
  if (els.introKicker) els.introKicker.textContent = copy.public.introKicker;
  if (els.introTitle) els.introTitle.textContent = copy.public.introTitle;
  if (els.introCardTitle1) els.introCardTitle1.textContent = copy.public.introCards[0].title;
  if (els.introCardText1) els.introCardText1.textContent = copy.public.introCards[0].text;
  if (els.introCardTitle2) els.introCardTitle2.textContent = copy.public.introCards[1].title;
  if (els.introCardText2) els.introCardText2.textContent = copy.public.introCards[1].text;
  if (els.introCardTitle3) els.introCardTitle3.textContent = copy.public.introCards[2].title;
  if (els.introCardText3) els.introCardText3.textContent = copy.public.introCards[2].text;
  if (els.aboutKicker) els.aboutKicker.textContent = copy.public.aboutKicker;
  if (els.aboutTitle) els.aboutTitle.textContent = copy.public.aboutTitle;
  if (els.aboutText) els.aboutText.textContent = copy.public.aboutText;
  if (els.aboutStat1) els.aboutStat1.textContent = copy.public.aboutStats[0];
  if (els.aboutStat2) els.aboutStat2.textContent = copy.public.aboutStats[1];
  if (els.aboutStat3) els.aboutStat3.textContent = copy.public.aboutStats[2];
  if (els.authKicker) {
    els.authKicker.textContent = copy.auth.kicker;
    els.authTitle.textContent = copy.auth.title;
    els.authText.textContent = copy.auth.text;
    els.authBackHome.textContent = copy.auth.backHome;
    renderTagList(els.authTags, copy.auth.tags);
    els.loginHeading.textContent = copy.auth.loginHeading;
    els.loginIdentifierLabel.textContent = copy.auth.loginIdentifierLabel;
    els.loginPasswordLabel.textContent = copy.auth.loginPasswordLabel;
    els.loginSubmit.textContent = copy.auth.loginSubmit;
    els.forgotPassword.textContent = copy.auth.forgotPassword;
    els.registerPrompt.textContent = copy.auth.registerPrompt;
    els.goRegister.textContent = copy.auth.goRegister;
    els.registerHeading.textContent = copy.auth.registerHeading;
    els.registerUsernameLabel.textContent = copy.auth.registerUsernameLabel;
    els.registerEmailLabel.textContent = copy.auth.registerEmailLabel;
    els.registerPasswordLabel.textContent = copy.auth.registerPasswordLabel;
    els.registerSubmit.textContent = copy.auth.registerSubmit;
    els.loginPrompt.textContent = copy.auth.loginPrompt;
    els.goLogin.textContent = copy.auth.goLogin;
    els.otpSubmit.textContent = copy.auth.otpSubmit;
    els.togglePassword.textContent = copy.auth.toggleShow;
    renderOtpCardContent();
  }
  if (page === "dashboard") {
    renderDashboardStats();
    updateUnlockStateUI();
    switchScreen(state.currentScreen);
  }
}

function toggleAuthCard(target) {
  if (!els.loginCard) return;
  els.loginCard.classList.toggle("hidden", target !== "login");
  els.registerCard.classList.toggle("hidden", target !== "register");
  els.otpCard.classList.toggle("hidden", target !== "otp");
  if (target === "otp") renderOtpCardContent();
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const line = text.trim().split("\n")[0] || "";
    throw new Error(line.startsWith("<") ? t().toasts.apiJsonError : line || t().toasts.apiJsonError);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function setSession(data, password) {
  state.token = data.token;
  state.user = data.user;
  state.tempPassword = password;
  state.notesUnlocked = false;
  state.personalKey = "";
  state.hasAuthenticatedInSession = true;
  localStorage.setItem("diaryToken", data.token);
  localStorage.setItem("diaryUser", JSON.stringify(data.user));
  sessionStorage.setItem("tempPassword", password);
  sessionStorage.setItem("diaryAuthenticatedThisSession", "true");
  sessionStorage.removeItem("personalKey");
}

function clearSession() {
  state.token = "";
  state.user = null;
  state.tempPassword = "";
  state.personalKey = "";
  state.notesUnlocked = false;
  state.notes = [];
  state.trash = [];
  state.sharedByMe = [];
  state.sharedWithMe = [];
  state.selectedNoteId = null;
  state.selectedSharedNoteId = "";
  state.personalKeyRequestId = "";
  state.profileAccessRequestId = "";
  state.passwordRequestId = "";
  state.accountDeletionRequestId = "";
  state.profileAccessUnlocked = false;
  state.sharedPayload = null;
  state.hasAuthenticatedInSession = false;
  localStorage.removeItem("diaryToken");
  localStorage.removeItem("diaryUser");
  sessionStorage.removeItem("tempPassword");
  sessionStorage.removeItem("personalKey");
  sessionStorage.removeItem("recoveryRequestId");
  sessionStorage.removeItem("diaryAuthenticatedThisSession");
}

function isPersonalKeyLinkedToPassword() {
  return Boolean(state.user && (state.user.personalKeyMatchesPassword || !state.user.hasPersonalKey));
}

function getEncryptionKey() { return state.personalKey || (isPersonalKeyLinkedToPassword() ? state.tempPassword : ""); }
function getDecryptionKey() { return state.notesUnlocked ? getEncryptionKey() : ""; }
function decryptText(cipherText, overrideKey = "") {
  const key = overrideKey || getDecryptionKey();
  if (!key) return "";
  try { return CryptoJS.AES.decrypt(cipherText, key).toString(CryptoJS.enc.Utf8) || ""; } catch { return ""; }
}
function encryptText(plainText, key) { return CryptoJS.AES.encrypt(plainText, key).toString(); }
function hasValidPersonalKey(key) {
  return isPersonalKeyLinkedToPassword()
    ? Boolean(key && key === state.tempPassword)
    : decryptText(state.user.personalKeyCheckCipher || "", key) === "bloomnote-personal-key-ready";
}
function getNoteKeyCandidates(overrideKey = "") {
  return [...new Set([
    overrideKey,
    state.personalKey,
    state.tempPassword,
    isPersonalKeyLinkedToPassword() ? state.tempPassword : "",
  ].filter(Boolean))];
}
function resolveNoteKey(note, overrideKey = "") {
  if (!note) return "";
  for (const key of getNoteKeyCandidates(overrideKey)) {
    const decryptedTitle = note.encryptedTitle ? decryptText(note.encryptedTitle, key) : "";
    const decryptedContent = note.encryptedContent ? decryptText(note.encryptedContent, key) : "";
    if (decryptedTitle || decryptedContent) return key;
  }
  return "";
}
function canDecryptNote(note, overrideKey = "") {
  return Boolean(resolveNoteKey(note, overrideKey));
}
function getNoteTitle(note, overrideKey = "") {
  const key = resolveNoteKey(note, overrideKey);
  if (note.encryptedTitle && key) {
    const decryptedTitle = decryptText(note.encryptedTitle, key);
    if (decryptedTitle) return decryptedTitle;
  }
  return note.title || t().toasts.encryptedTitle;
}
function getNoteContent(note, overrideKey = "") {
  const key = resolveNoteKey(note, overrideKey);
  return note.encryptedContent && key ? decryptText(note.encryptedContent, key) : "";
}

function renderDashboardStats() {
  if (!els.activeCount) return;
  const copy = t().dashboard;
  els.activeCount.textContent = String(state.notes.length);
  els.trashCount.textContent = String(state.trash.length);
  els.keyStatus.textContent = state.notesUnlocked ? copy.notesUnlocked : copy.notesLocked;
}

function updateUnlockStateUI() {
  if (!els.unlockNotes) return;
  const copy = t().dashboard;
  els.unlockNotes.textContent = state.notesUnlocked ? copy.lockButton : copy.unlockButton;
  els.notesSecurityHint.textContent = state.notesUnlocked ? copy.unlockedHint : copy.lockedHint;
  els.noteSearch.placeholder = t().toasts.searchPlaceholder;
  if (els.shareStatus) els.shareStatus.textContent = t().toasts.shareInfo;
  if (els.noteEditor) els.noteEditor.classList.toggle("is-locked", !state.notesUnlocked && Boolean(state.selectedNoteId));
}

function renderNotes() {
  if (!els.notesList || !els.trashList || !els.noteSearch) return;
  const copy = t().dashboard;
  const query = els.noteSearch.value.trim().toLowerCase();
  const visibleNotes = state.notes.filter((note) => {
    const title = state.notesUnlocked && canDecryptNote(note) ? getNoteTitle(note) : t().toasts.encryptedTitle;
    return !query || title.toLowerCase().includes(query);
  });
  if (!visibleNotes.length) {
    els.notesList.innerHTML = `<article class="note-card"><p>${escapeHtml(copy.emptyNotes)}</p></article>`;
  } else {
    els.notesList.innerHTML = visibleNotes.map((note) => {
      const isReadable = state.notesUnlocked && canDecryptNote(note);
      const title = isReadable ? getNoteTitle(note) : t().toasts.encryptedTitle;
      const preview = isReadable ? getNoteContent(note) : note.encryptedContent;
      return `<article class="note-card"><span class="note-meta">${isReadable ? copy.unlockedBadge : copy.lockedBadge}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml((preview || note.encryptedContent || "").slice(0, 140))}</p><div class="row"><button class="secondary-btn" type="button" onclick="selectNote('${note.id}')">${copy.openLabel}</button><button class="secondary-btn" type="button" onclick="deleteNote('${note.id}')">${copy.deleteLabel}</button></div></article>`;
    }).join("");
  }
  if (!state.trash.length) {
    els.trashList.innerHTML = `<article class="note-card"><p>${escapeHtml(copy.emptyTrash)}</p></article>`;
    return;
  }
  els.trashList.innerHTML = state.trash.map((note) => {
    const isReadable = state.notesUnlocked && canDecryptNote(note);
    const title = isReadable ? getNoteTitle(note) : t().toasts.encryptedTitle;
    const preview = isReadable ? getNoteContent(note) : note.encryptedContent || "";
    return `<article class="note-card"><span class="note-meta">${escapeHtml(isReadable ? copy.unlockedBadge : copy.lockedBadge)}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(preview.slice(0, 140))}</p><div class="row"><button class="secondary-btn" type="button" onclick="restoreNote('${note.id}')">${copy.restoreLabel}</button><button class="secondary-btn" type="button" onclick="permanentlyDeleteNote('${note.id}')">${copy.permanentDeleteLabel}</button></div></article>`;
  }).join("");
}

function setEditorMode() {
  if (!els.noteEditor || !els.noteTitle) return;
  const locked = Boolean(state.selectedNoteId) && !state.notesUnlocked;
  els.noteEditor.contentEditable = String(!locked);
  els.noteEditor.classList.toggle("is-locked", locked);
  els.noteTitle.readOnly = locked;
}

function switchScreen(screenId) {
  if (!els.screens.length) return;
  state.currentScreen = screenId;
  els.screens.forEach((screen) => screen.classList.toggle("hidden", screen.id !== screenId));
  els.sideButtons.forEach((button) => button.classList.toggle("active", button.dataset.screen === screenId));
  if (els.fab) els.fab.classList.toggle("hidden", screenId !== "notes");
  const [title, subtitle] = t().dashboard.screens[screenId] || ["Dashboard", ""];
  if (els.screenTitle) els.screenTitle.textContent = title;
  if (els.screenSubtitle) els.screenSubtitle.textContent = subtitle;
  updateUnlockStateUI();
  setEditorMode();
}

async function refreshNotes() {
  if (!state.token) return;
  state.notes = await api("/notes");
  state.trash = await api("/notes?includeTrash=true");
  renderDashboardStats();
  renderNotes();
}

async function refreshSharedNotes() {
  if (!state.token || !els.sharedWithMeList || !els.sharedByMeList) return;
  state.sharedWithMe = await api("/notes/shared-with-me");
  state.sharedByMe = await api("/notes/shared-by-me");
  renderSharedLists();
}

function renderSharedLists() {
  if (!els.sharedWithMeList || !els.sharedByMeList) return;

  if (!state.sharedWithMe.length) {
    els.sharedWithMeList.innerHTML = `<article class="note-card"><p>${escapeHtml(state.language === "vi" ? "Chưa có nhật ký nào được chia sẻ cho bạn." : "No notes have been shared with you yet.")}</p></article>`;
  } else {
    els.sharedWithMeList.innerHTML = state.sharedWithMe.map((share) => `
      <article class="note-card">
        <span class="note-meta">${escapeHtml(share.canEdit ? "Can edit" : "View only")}</span>
        <h4>${escapeHtml(share.ownerName || "Owner")}</h4>
        <p>${escapeHtml(share.canView ? "Mo note nay tu dashboard de nhap khoa va xem." : "Chu so huu dang tam tat quyen xem.")}</p>
        <div class="row">
          <button class="secondary-btn" type="button" onclick="openSharedDashboardNote('${share.id}')">Mở</button>
          <button class="secondary-btn" type="button" onclick="removeSharedDashboardNote('${share.id}')">Ẩn</button>
        </div>
      </article>
    `).join("");
  }

  if (!state.sharedByMe.length) {
    els.sharedByMeList.innerHTML = `<article class="note-card"><p>${escapeHtml(state.language === "vi" ? "Bạn chưa chia sẻ nhật ký nào." : "You have not shared any notes yet.")}</p></article>`;
  } else {
    els.sharedByMeList.innerHTML = state.sharedByMe.map((share) => `
      <article class="note-card">
        <span class="note-meta">${escapeHtml(share.accessMode === "edit" ? "Edit access" : "Public view")}</span>
        <h4>${escapeHtml(share.recipientName || "Public link")}</h4>
        <p>${escapeHtml(`View: ${share.canView ? "On" : "Off"} | Edit: ${share.canEdit ? "On" : "Off"}`)}</p>
        <div class="row">
          <button class="secondary-btn" type="button" onclick="openSharedDashboardNote('${share.id}')">Mở</button>
          <button class="secondary-btn" type="button" onclick="toggleShareViewAccess('${share.id}', ${share.canView ? "false" : "true"})">${share.canView ? "Tắt xem" : "Bật xem"}</button>
          ${share.accessMode === "edit" ? `<button class="secondary-btn" type="button" onclick="toggleShareEditAccess('${share.id}', ${share.canEdit ? "false" : "true"})">${share.canEdit ? "Khóa sửa" : "Cho sửa"}</button>` : ""}
          <button class="secondary-btn" type="button" onclick="stopOwnedShare('${share.id}')">Ngừng chia sẻ</button>
        </div>
      </article>
    `).join("");
  }
}

window.selectNote = function selectNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;
  if (!state.notesUnlocked) {
    state.selectedNoteId = noteId;
    els.noteTitle.value = note.title || "";
    els.noteEditor.innerHTML = "";
    setEditorMode();
    return showToast(t().toasts.unlockRequiredForExisting);
  }
  if (!canDecryptNote(note)) return showToast(t().toasts.invalidKey);
  state.selectedNoteId = noteId;
  els.noteTitle.value = getNoteTitle(note);
  els.noteEditor.innerHTML = getNoteContent(note);
  if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
  setEditorMode();
};

window.deleteNote = async function deleteNote(noteId) {
  try {
    await api(`/notes/${noteId}`, { method: "DELETE" });
    if (state.selectedNoteId === noteId) {
      state.selectedNoteId = null;
      els.noteTitle.value = "";
      els.noteEditor.innerHTML = "";
    }
    showToast(t().toasts.movedToTrash);
    await refreshNotes();
  } catch (error) { showToast(error.message); }
};

window.restoreNote = async function restoreNote(noteId) {
  try { await api(`/notes/${noteId}/restore`, { method: "POST" }); showToast(t().toasts.restored); await refreshNotes(); } catch (error) { showToast(error.message); }
};

window.permanentlyDeleteNote = async function permanentlyDeleteNote(noteId) {
  try {
    await api(`/notes/${noteId}/permanent`, { method: "DELETE" });
    if (state.selectedNoteId === noteId) {
      resetNoteEditorForNewEntry();
    }
    showToast(t().toasts.permanentlyDeleted);
    await refreshNotes();
  } catch (error) { showToast(error.message); }
};

async function saveNote() {
  const title = els.noteTitle.value.trim();
  const content = els.noteEditor.innerHTML.trim();
  const encryptionKey = getEncryptionKey();
  if (!title || !content) return showToast(t().toasts.needFields);
  if (!encryptionKey) return showToast(t().toasts.needKey);
  if (state.selectedNoteId && !state.notesUnlocked) return showToast(t().toasts.needUnlock);
  try {
    await api(state.selectedNoteId ? `/notes/${state.selectedNoteId}` : "/notes", {
      method: state.selectedNoteId ? "PUT" : "POST",
      body: JSON.stringify({ title, content, encryptionKey }),
    });
    showToast(t().toasts.saved);
    resetNoteEditorForNewEntry();
    await refreshNotes();
  } catch (error) { showToast(error.message); }
}

async function shareSelectedNote() {
  if (!state.selectedNoteId) return showToast(t().toasts.noNoteToShare);
  if (!state.notesUnlocked) return showToast(t().toasts.needUnlock);
  if (els.shareTestKey) els.shareTestKey.value = "";
  openModal(els.shareKeyModal);
}

async function confirmShareSelectedNote() {
  const sharedTestKey = els.shareTestKey?.value.trim() || "";
  if (!sharedTestKey) return showToast(t().toasts.needShareKey);
  const accessMode = els.shareAccessMode?.value || "view";
  const recipientIdentifier = els.shareRecipient?.value.trim() || "";
  if (accessMode === "edit" && !recipientIdentifier) return showToast(t().toasts.needRecipient);
  try {
    const note = state.notes.find((item) => item.id === state.selectedNoteId);
    if (!note) return showToast(t().toasts.noNoteToShare);
    const data = await api(`/notes/${state.selectedNoteId}/share`, {
      method: "POST",
      body: JSON.stringify({ sharedTitle: getNoteTitle(note), sharedContent: getNoteContent(note), sharedTestKey, accessMode, recipientIdentifier }),
    });
    if (els.shareLinkOutput) els.shareLinkOutput.value = data.shareLink;
    if (els.shareLinkPanel) els.shareLinkPanel.classList.remove("hidden");
    closeModal(els.shareKeyModal);
    await navigator.clipboard.writeText(data.shareLink);
    showToast(t().toasts.shareCreated);
    await refreshSharedNotes();
  } catch (error) { showToast(error.message); }
}

async function loadProfile() {
  if (!state.token) return;
  const user = await api("/user/me");
  state.user = user;
  localStorage.setItem("diaryUser", JSON.stringify(user));
  els.profileDisplayName.value = user.displayName || "";
  els.profileUsername.value = user.username || "";
  els.profileBirthDate.value = user.birthDate || "";
  els.profileEmail.value = user.email || "";
  els.profileGender.value = user.gender || "";
  if (els.userDropdownTrigger) els.userDropdownTrigger.textContent = user.displayName || user.username || "User";
}

async function saveProfile() {
  try {
    const data = await api("/user/me", {
      method: "PUT",
      body: JSON.stringify({ displayName: els.profileDisplayName.value.trim(), birthDate: els.profileBirthDate.value, email: els.profileEmail.value.trim(), gender: els.profileGender.value }),
    });
    state.user = data.user;
    localStorage.setItem("diaryUser", JSON.stringify(data.user));
    renderDashboardStats();
    updateUnlockStateUI();
    showToast(t().toasts.profileSaved);
  } catch (error) { showToast(error.message); }
}

function resetNoteEditorForNewEntry() {
  state.selectedNoteId = null;
  if (els.noteTitle) els.noteTitle.value = "";
  if (els.noteEditor) els.noteEditor.innerHTML = "";
  if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
  setEditorMode();
}

async function requestPersonalKeyOtp() {
  const currentPersonalKey = els.profileCurrentPersonalKey?.value || "";
  const newPersonalKey = els.profileNewPersonalKey.value.trim();
  if (!currentPersonalKey) return showToast(t().toasts.needCurrentPersonalKey);
  if (!newPersonalKey) return showToast(t().toasts.needNewPersonalKey);
  try {
    const data = await api("/user/personal-key/request-otp", {
      method: "POST",
      body: JSON.stringify({ currentPersonalKey, newPersonalKey }),
    });
    state.personalKeyRequestId = data.requestId;
    showToast(t().toasts.personalKeyOtpSent);
  } catch (error) { showToast(error.message); }
}

function openModal(element) { if (element) element.classList.remove("hidden"); }
function closeModal(element) { if (element) element.classList.add("hidden"); }
function openSecurityStepModal(element) {
  closeModal(els.securityModal);
  openModal(element);
}

function openUnlockNotesModal() {
  if (els.notesUnlockKey) {
    els.notesUnlockKey.value = state.personalKey || (isPersonalKeyLinkedToPassword() ? state.tempPassword : "");
  }
  openModal(els.notesUnlockModal);
}

function confirmUnlockNotes() {
  const key = els.notesUnlockKey?.value.trim() || "";
  if (!key) return showToast(t().toasts.needKey);
  if (!hasValidPersonalKey(key)) return showToast(t().toasts.invalidKey);
  const hasReadableNotes = !state.notes.length && !state.trash.length
    ? true
    : [...state.notes, ...state.trash].some((note) => canDecryptNote(note, key));
  if (!hasReadableNotes) return showToast(t().toasts.invalidKey);
  state.personalKey = key;
  state.notesUnlocked = true;
  sessionStorage.setItem("personalKey", key);
  closeModal(els.notesUnlockModal);
  renderDashboardStats();
  updateUnlockStateUI();
  renderNotes();
  if (state.selectedNoteId) {
    const selectedNote = state.notes.find((note) => note.id === state.selectedNoteId);
    if (!selectedNote || !canDecryptNote(selectedNote)) {
      resetNoteEditorForNewEntry();
    } else {
      els.noteTitle.value = getNoteTitle(selectedNote, key);
      els.noteEditor.innerHTML = getNoteContent(selectedNote, key);
      if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
      setEditorMode();
    }
  }
  showToast(t().toasts.unlockSuccess);
}

async function requestProfileAccessOtp() {
  try {
    const data = await api("/user/profile-access/request-otp", { method: "POST", body: JSON.stringify({}) });
    state.profileAccessRequestId = data.requestId;
    closeModal(els.profileAccessModal);
    openModal(els.profileOtpModal);
    showToast(t().toasts.profileAccessOtpSent);
  } catch (error) { showToast(error.message); }
}

async function requestRecoveryOtp() {
  try {
    const data = await api("/user/recovery/request-otp", { method: "POST", body: JSON.stringify({}) });
    state.recoveryRequestId = data.requestId;
    sessionStorage.setItem("recoveryRequestId", data.requestId);
    closeModal(els.profileAccessModal);
    openModal(els.recoveryModal);
    showToast(t().toasts.recoveryOtpSent);
  } catch (error) { showToast(error.message); }
}

async function confirmProfileAccessOtp() {
  try {
    await api("/user/profile-access/confirm", { method: "POST", body: JSON.stringify({ requestId: state.profileAccessRequestId, otp: els.profileAccessOtp.value.trim() }) });
    state.profileAccessUnlocked = true;
    closeModal(els.profileOtpModal);
    switchScreen("profile");
    await loadProfile();
    showToast(t().toasts.profileAccessGranted);
  } catch (error) { showToast(error.message); }
}

async function confirmRecoveryOtp() {
  const otp = els.recoveryOtp.value.trim();
  const newPassword = els.recoveryNewPassword.value;
  if (!otp || !newPassword) return showToast(t().toasts.needPasswordFields);
  try {
    const data = await api("/user/recovery/confirm", { method: "POST", body: JSON.stringify({ requestId: state.recoveryRequestId, otp, newPassword }) });
    state.user = data.user;
    state.tempPassword = newPassword;
    state.personalKey = "";
    state.notesUnlocked = false;
    state.profileAccessUnlocked = true;
    state.recoveryRequestId = "";
    sessionStorage.removeItem("recoveryRequestId");
    sessionStorage.setItem("tempPassword", newPassword);
    sessionStorage.removeItem("personalKey");
    localStorage.setItem("diaryUser", JSON.stringify(data.user));
    els.recoveryOtp.value = "";
    els.recoveryNewPassword.value = "";
    closeModal(els.recoveryModal);
    switchScreen("profile");
    await loadProfile();
    showToast(t().toasts.recoverySuccess);
  } catch (error) { showToast(error.message); }
}

async function requestPasswordOtp() {
  const currentPassword = els.securityCurrentPassword?.value || "";
  const newPassword = els.securityNewPassword.value;
  if (!currentPassword) return showToast(t().toasts.needCurrentPassword);
  if (!newPassword) return showToast(t().toasts.needPasswordFields);
  if (isPersonalKeyLinkedToPassword() && state.notes.length && !state.notesUnlocked) {
    return showToast(t().toasts.needUnlockBeforePasswordChange);
  }
  try {
    const data = await api("/user/password/request-otp", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
    state.passwordRequestId = data.requestId;
    showToast(t().toasts.passwordOtpSent);
  } catch (error) { showToast(error.message); }
}

async function confirmPasswordChange() {
  if (!els.securityNewPassword.value || !els.securityPasswordOtp.value.trim()) return showToast(t().toasts.needPasswordFields);
  try {
    const payload = {
      requestId: state.passwordRequestId,
      otp: els.securityPasswordOtp.value.trim(),
    };
    if (isPersonalKeyLinkedToPassword()) {
      payload.reEncryptedNotes = buildReEncryptedNotes(
        els.securityNewPassword.value,
        t().toasts.needUnlockBeforePasswordChange,
        t().toasts.passwordChangeReencryptFailed
      );
    }
    const data = await api("/user/password/confirm", { method: "POST", body: JSON.stringify(payload) });
    state.user = data.user || state.user;
    state.tempPassword = els.securityNewPassword.value;
    state.passwordRequestId = "";
    if (isPersonalKeyLinkedToPassword()) {
      state.personalKey = "";
      state.notesUnlocked = Boolean(state.notes.length);
      sessionStorage.removeItem("personalKey");
    }
    sessionStorage.setItem("tempPassword", state.tempPassword);
    localStorage.setItem("diaryUser", JSON.stringify(state.user));
    if (els.securityCurrentPassword) els.securityCurrentPassword.value = "";
    els.securityNewPassword.value = "";
    els.securityPasswordOtp.value = "";
    await refreshNotes();
    renderDashboardStats();
    updateUnlockStateUI();
    closeModal(els.securityPasswordModal);
    showToast(t().toasts.passwordUpdated);
  } catch (error) { showToast(error.message); }
}

function buildReEncryptedNotes(newPersonalKey, unlockErrorMessage = t().toasts.needUnlockBeforeChange, decryptErrorMessage = t().toasts.invalidKey) {
  const currentKey = isPersonalKeyLinkedToPassword() ? (state.personalKey || state.tempPassword) : state.personalKey;
  if (!currentKey) throw new Error(unlockErrorMessage);
  return [...state.notes, ...state.trash].map((note) => {
    const title = getNoteTitle(note, currentKey);
    const content = getNoteContent(note, currentKey);
    if (!title || !content) throw new Error(decryptErrorMessage);
    return { id: note.id, encryptedTitle: encryptText(title, newPersonalKey), encryptedContent: encryptText(content, newPersonalKey) };
  });
}

async function confirmPersonalKeyChange() {
  const currentPersonalKey = els.profileCurrentPersonalKey?.value || "";
  const newPersonalKey = els.profileNewPersonalKey.value.trim();
  const otp = els.profilePersonalKeyOtp.value.trim();
  if (!currentPersonalKey) return showToast(t().toasts.needCurrentPersonalKey);
  if (!newPersonalKey) return showToast(t().toasts.needNewPersonalKey);
  if (!otp) return showToast(t().toasts.needOtp);
  if (!state.personalKeyRequestId) return showToast(t().toasts.personalKeyOtpSent);
  try {
    const data = await api("/user/personal-key/confirm", {
      method: "POST",
      body: JSON.stringify({ requestId: state.personalKeyRequestId, otp, currentPersonalKey, newPersonalKey }),
    });
    state.user = data.user;
    state.user.personalKeyMatchesPassword = false;
    state.user.personalKeyCheckCipher = encryptText("bloomnote-personal-key-ready", newPersonalKey);
    state.personalKey = newPersonalKey;
    state.notesUnlocked = true;
    state.personalKeyRequestId = "";
    sessionStorage.setItem("personalKey", newPersonalKey);
    localStorage.setItem("diaryUser", JSON.stringify(data.user));
    if (els.profileCurrentPersonalKey) els.profileCurrentPersonalKey.value = "";
    els.profileNewPersonalKey.value = "";
    els.profilePersonalKeyOtp.value = "";
    showToast(t().toasts.personalKeyUpdated);
    await refreshNotes();
    await loadProfile();
    closeModal(els.personalKeyModal);
  } catch (error) { showToast(error.message); }
}

async function requestAccountDeletionOtp() {
  const currentPassword = els.deleteAccountPassword?.value || "";
  const currentPersonalKey = els.deleteAccountPersonalKey?.value || "";
  if (!currentPassword) return showToast(t().toasts.needCurrentPassword);
  if (!currentPersonalKey) return showToast(t().toasts.needCurrentPersonalKey);

  try {
    const data = await api("/user/account-delete/request-otp", {
      method: "POST",
      body: JSON.stringify({ currentPassword, currentPersonalKey }),
    });
    state.accountDeletionRequestId = data.requestId;
    showToast(t().toasts.accountDeleteOtpSent);
  } catch (error) { showToast(error.message); }
}

function confirmAccountDeletionPrompt() {
  const currentPassword = els.deleteAccountPassword?.value || "";
  const currentPersonalKey = els.deleteAccountPersonalKey?.value || "";
  const otp = els.deleteAccountOtp?.value.trim() || "";
  if (!currentPassword || !currentPersonalKey || !otp) {
    return showToast(t().toasts.needDeleteFields);
  }
  if (!state.accountDeletionRequestId) {
    return showToast(t().toasts.accountDeleteOtpSent);
  }
  openModal(els.deleteAccountConfirmModal);
}

async function finalizeAccountDeletion() {
  try {
    await api("/user/account-delete/confirm", {
      method: "POST",
      body: JSON.stringify({ requestId: state.accountDeletionRequestId, otp: els.deleteAccountOtp.value.trim() }),
    });
    closeModal(els.deleteAccountConfirmModal);
    closeModal(els.deleteAccountModal);
    clearSession();
    if (els.deleteAccountPassword) els.deleteAccountPassword.value = "";
    if (els.deleteAccountPersonalKey) els.deleteAccountPersonalKey.value = "";
    if (els.deleteAccountOtp) els.deleteAccountOtp.value = "";
    showToast(t().toasts.accountDeleted);
    goToLogin();
  } catch (error) { showToast(error.message); }
}

async function loadSharedNote() {
  const hash = window.location.hash.replace("#", "");
  if (!hash.startsWith("share/")) return false;
  const shareToken = hash.split("/")[1];
  const sidebar = document.querySelector(".sidebar");
  const userMenu = document.querySelector(".user-menu");
  try {
      const data = await api(`/notes/shared/${shareToken}`);
      state.sharedPayload = data;
      state.selectedSharedNoteId = data.id || "";
      if (sidebar) sidebar.classList.add("hidden");
      if (userMenu) userMenu.classList.add("hidden");
      switchScreen("share-view");
      els.sharedNoteTitle.textContent = t().toasts.encryptedTitle;
      els.sharedNoteKey.textContent = t().toasts.shareInfo;
      els.sharedNoteAccessKey.value = "";
      if (els.sharedNoteTitleInput) els.sharedNoteTitleInput.value = t().toasts.encryptedTitle;
      els.sharedNoteContent.value = data.encryptedContent;
      if (els.sharedNoteSave) els.sharedNoteSave.classList.add("hidden");
  } catch (error) {
    showToast(error.message || t().toasts.sharedLoadError);
  }
  return true;
}

async function openSharedNoteForDashboard(shareId) {
  const data = await api(`/notes/shares/${shareId}`);
  state.sharedPayload = data;
  state.selectedSharedNoteId = shareId;
  switchScreen("share-view");
  els.sharedNoteTitle.textContent = data.canView ? (data.recipientName || data.ownerName || "Shared note") : t().toasts.encryptedTitle;
  els.sharedNoteKey.textContent = data.canView ? (data.canEdit ? "Nhap khoa de mo va co the chinh sua." : "Nhap khoa de xem noi dung duoc chia se.") : "Chu so huu dang tat quyen xem.";
  els.sharedNoteAccessKey.value = "";
  if (els.sharedNoteTitleInput) {
    els.sharedNoteTitleInput.value = data.canView ? "" : t().toasts.encryptedTitle;
    els.sharedNoteTitleInput.readOnly = true;
  }
  els.sharedNoteContent.value = data.encryptedContent || "";
  els.sharedNoteContent.readOnly = true;
  if (els.sharedNoteSave) els.sharedNoteSave.classList.toggle("hidden", true);
}

window.openSharedDashboardNote = async function openSharedDashboardNote(shareId) {
  try {
    await openSharedNoteForDashboard(shareId);
  } catch (error) { showToast(error.message); }
};

window.removeSharedDashboardNote = async function removeSharedDashboardNote(shareId) {
  try {
    await api(`/notes/shared-with-me/${shareId}/remove`, { method: "POST" });
    showToast(t().toasts.shareRemoved);
    await refreshSharedNotes();
  } catch (error) { showToast(error.message); }
};

window.toggleShareViewAccess = async function toggleShareViewAccess(shareId, canView) {
  try {
    await api(`/notes/shares/${shareId}/access`, { method: "PATCH", body: JSON.stringify({ canView }) });
    showToast(t().toasts.shareUpdated);
    await refreshSharedNotes();
  } catch (error) { showToast(error.message); }
};

window.toggleShareEditAccess = async function toggleShareEditAccess(shareId, canEdit) {
  try {
    await api(`/notes/shares/${shareId}/access`, { method: "PATCH", body: JSON.stringify({ canEdit }) });
    showToast(t().toasts.shareUpdated);
    await refreshSharedNotes();
  } catch (error) { showToast(error.message); }
};

window.deleteOwnedShare = async function deleteOwnedShare(shareId) {
  try {
    await api(`/notes/shares/${shareId}`, { method: "DELETE" });
    showToast(t().toasts.shareRemoved);
    await refreshSharedNotes();
  } catch (error) { showToast(error.message); }
};

window.stopOwnedShare = async function stopOwnedShare(shareId) {
  try {
    await api(`/notes/shares/${shareId}/stop`, { method: "POST" });
    showToast(t().toasts.shareStopped);
    await refreshSharedNotes();
  } catch (error) { showToast(error.message); }
};

function initCommonEvents() {
  on(els.languageToggle, "click", () => {
    state.language = state.language === "vi" ? "en" : "vi";
    renderMarketingContent();
    renderNotes();
  });
}

function initHomePage() {
  renderMarketingContent();
  els.navButtons.forEach((button) => on(button, "click", () => {
    const target = byId(button.dataset.section);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  on(els.brandHome, "click", () => goToHome("home"));
  on(els.navLogin, "click", goToLogin);
  on(els.heroAbout, "click", () => byId("about")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  on(els.heroLogin, "click", goToLogin);
  const section = byId(window.location.hash.replace("#", ""));
  if (section) requestAnimationFrame(() => section.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function initLoginPage() {
  renderMarketingContent();
  if (state.token && state.user && state.hasAuthenticatedInSession) return goToDashboard();
  toggleAuthCard(state.pendingId || state.forgotPasswordRequestId ? "otp" : "login");
  on(els.brandHome, "click", () => goToHome("home"));
  on(els.navLogin, "click", goToLogin);
  els.navButtons.forEach((button) => on(button, "click", () => goToHome(button.dataset.section)));
  on(els.authBackHome, "click", () => goToHome("home"));
  on(els.goRegister, "click", () => { state.authFlow = "register"; sessionStorage.setItem("authFlow", "register"); toggleAuthCard("register"); });
  on(els.goLogin, "click", () => { state.authFlow = "register"; sessionStorage.setItem("authFlow", "register"); toggleAuthCard("login"); });
  on(els.togglePassword, "click", () => {
    const currentType = els.loginPassword.getAttribute("type");
    const copy = t().auth;
    els.loginPassword.setAttribute("type", currentType === "password" ? "text" : "password");
    els.togglePassword.textContent = currentType === "password" ? copy.toggleHide : copy.toggleShow;
  });
  on(els.loginSubmit, "click", async () => {
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ identifier: els.loginIdentifier.value.trim(), password: els.loginPassword.value }) });
      setSession(data, els.loginPassword.value);
      showToast(t().toasts.loginSuccess);
      goToDashboard();
    } catch (error) { showToast(error.message); }
  });
  on(els.forgotPassword, "click", async () => {
    const email = window.prompt(t().toasts.forgotPrompt, els.loginIdentifier.value.trim());
    if (!email) return;
    try {
      const data = await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      state.authFlow = "forgot";
      state.forgotPasswordRequestId = data.requestId;
      sessionStorage.setItem("authFlow", "forgot");
      sessionStorage.setItem("forgotPasswordRequestId", data.requestId);
      toggleAuthCard("otp");
      showToast(data.message || t().toasts.forgotOtpSent);
    } catch (error) { showToast(error.message); }
  });
  on(els.registerSubmit, "click", async () => {
    try {
      const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ username: els.registerUsername.value.trim(), email: els.registerEmail.value.trim(), password: els.registerPassword.value }) });
      state.authFlow = "register";
      state.pendingId = data.pendingId;
      sessionStorage.setItem("authFlow", "register");
      sessionStorage.setItem("pendingId", data.pendingId);
      toggleAuthCard("otp");
      showToast(t().toasts.registerOtp);
    } catch (error) { showToast(error.message); }
  });
  on(els.otpResend, "click", async () => {
    if (state.authFlow !== "register" || !state.pendingId) return;
    try {
      await api("/auth/resend-otp", { method: "POST", body: JSON.stringify({ pendingId: state.pendingId }) });
      showToast(t().toasts.resendOtp);
    } catch (error) { showToast(error.message); }
  });
  on(els.otpSubmit, "click", async () => {
    try {
      const otp = els.otpCode.value.trim();
      if (state.authFlow === "forgot") {
        const newPassword = els.otpNewPassword.value;
        if (!newPassword) return showToast(t().toasts.needForgotPassword);
        await api("/auth/forgot-password/verify", { method: "POST", body: JSON.stringify({ requestId: state.forgotPasswordRequestId, otp, newPassword }) });
        state.forgotPasswordRequestId = "";
        state.authFlow = "register";
        sessionStorage.removeItem("forgotPasswordRequestId");
        sessionStorage.setItem("authFlow", "register");
        els.otpCode.value = "";
        if (els.otpNewPassword) els.otpNewPassword.value = "";
        toggleAuthCard("login");
        return showToast(t().toasts.forgotSuccess);
      }
      await api("/auth/verify-otp", { method: "POST", body: JSON.stringify({ pendingId: state.pendingId, otp }) });
      state.pendingId = "";
      sessionStorage.removeItem("pendingId");
      els.otpCode.value = "";
      toggleAuthCard("login");
      showToast(t().toasts.registerSuccess);
    } catch (error) { showToast(error.message); }
  });
}

function initDashboardPage() {
  renderMarketingContent();
  document.querySelectorAll(".welcome-actions [data-screen]").forEach((button) => on(button, "click", async () => {
    switchScreen(button.dataset.screen);
    if (button.dataset.screen === "profile") await loadProfile();
    if (button.dataset.screen === "notes" && !state.selectedNoteId) resetNoteEditorForNewEntry();
  }));
  on(els.shareAccessMode, "change", () => {
    if (els.shareRecipientField) els.shareRecipientField.classList.toggle("hidden", els.shareAccessMode.value !== "edit");
  });
  on(els.sharedNoteUnlock, "click", () => {
    const key = els.sharedNoteAccessKey.value.trim();
    if (!key || !state.sharedPayload) return;
    if (state.sharedPayload.canView === false) return showToast(t().toasts.invalidKey);
    const title = decryptText(state.sharedPayload.encryptedTitle, key);
    const content = decryptText(state.sharedPayload.encryptedContent, key);
    if (!title || !content) return showToast(t().toasts.sharedUnlockFailed);
    els.sharedNoteTitle.textContent = title;
    if (els.sharedNoteTitleInput) els.sharedNoteTitleInput.value = title;
    els.sharedNoteContent.value = content;
    const canEdit = Boolean(state.sharedPayload.canEdit && (state.sharedPayload.isOwner || state.sharedPayload.isRecipient));
    if (els.sharedNoteTitleInput) els.sharedNoteTitleInput.readOnly = !canEdit;
    els.sharedNoteContent.readOnly = !canEdit;
    if (els.sharedNoteSave) els.sharedNoteSave.classList.toggle("hidden", !canEdit);
    showToast(t().toasts.sharedUnlockSuccess);
  });
  on(els.sharedNoteSave, "click", async () => {
    try {
      if (!state.selectedSharedNoteId) return;
      const sharedTestKey = els.sharedNoteAccessKey.value.trim();
      await api(`/notes/shares/${state.selectedSharedNoteId}`, {
        method: "PUT",
        body: JSON.stringify({ title: els.sharedNoteTitleInput.value.trim(), content: els.sharedNoteContent.value.trim(), sharedTestKey }),
      });
      showToast(t().toasts.shareSaved);
      await refreshSharedNotes();
    } catch (error) { showToast(error.message); }
  });
  loadSharedNote().then((shared) => {
    if (shared) return;
    if (!state.token || !state.user || !state.hasAuthenticatedInSession) return goToLogin();
    if (els.userDropdownTrigger) els.userDropdownTrigger.textContent = state.user.displayName || state.user.username || "User";
    switchScreen("dashboard-home");
    refreshNotes();
    refreshSharedNotes();
    loadProfile();
  });
  els.sideButtons.forEach((button) => on(button, "click", async () => {
    switchScreen(button.dataset.screen);
    if (button.dataset.screen === "profile") await loadProfile();
    if (button.dataset.screen === "notes" && !state.selectedNoteId) resetNoteEditorForNewEntry();
  }));
  on(els.userDropdownTrigger, "click", () => els.userDropdown && els.userDropdown.classList.toggle("hidden"));
  els.dropdownActions.forEach((button) => on(button, "click", async () => {
    const action = button.dataset.profileAction;
    if (els.userDropdown) els.userDropdown.classList.add("hidden");
    if (action === "profile") { state.profileAccessUnlocked = false; els.profileAccessKey.value = ""; return openModal(els.profileAccessModal); }
    if (action === "switch" || action === "logout") { clearSession(); showToast(action === "switch" ? t().toasts.switchAccount : t().toasts.logout); goToLogin(); }
  }));
  document.querySelectorAll(".editor-toolbar button").forEach((button) => on(button, "click", () => { if (!state.selectedNoteId || state.notesUnlocked) document.execCommand(button.dataset.command, false, null); }));
  on(els.noteSearch, "input", renderNotes);
  on(els.unlockNotes, "click", () => {
    if (state.notesUnlocked) {
      state.notesUnlocked = false;
      state.personalKey = "";
      sessionStorage.removeItem("personalKey");
      resetNoteEditorForNewEntry();
      renderDashboardStats();
      updateUnlockStateUI();
      renderNotes();
      return showToast(t().toasts.lockSuccess);
    }
    openUnlockNotesModal();
  });
  on(els.saveNote, "click", saveNote);
  on(els.shareNote, "click", shareSelectedNote);
  on(els.fab, "click", () => { switchScreen("notes"); resetNoteEditorForNewEntry(); });
  on(els.saveProfile, "click", saveProfile);
  on(els.openSecurityPanel, "click", () => openModal(els.securityModal));
  on(els.securityOptionPassword, "click", () => openSecurityStepModal(els.securityPasswordModal));
  on(els.securityOptionKey, "click", () => openSecurityStepModal(els.personalKeyModal));
  on(els.securityOptionDelete, "click", () => openSecurityStepModal(els.deleteAccountModal));
  on(els.requestPersonalKeyOtp, "click", requestPersonalKeyOtp);
  on(els.confirmPersonalKey, "click", confirmPersonalKeyChange);
  on(els.securityPasswordRequest, "click", requestPasswordOtp);
  on(els.securityPasswordConfirm, "click", confirmPasswordChange);
  on(els.deleteAccountRequest, "click", requestAccountDeletionOtp);
  on(els.deleteAccountConfirm, "click", confirmAccountDeletionPrompt);
  on(els.deleteAccountFinalConfirm, "click", finalizeAccountDeletion);
  on(els.deleteAccountFinalClose, "click", () => closeModal(els.deleteAccountConfirmModal));
  on(els.securityClose, "click", () => closeModal(els.securityModal));
  on(els.securityPasswordClose, "click", () => closeModal(els.securityPasswordModal));
  on(els.personalKeyClose, "click", () => closeModal(els.personalKeyModal));
  on(els.deleteAccountClose, "click", () => closeModal(els.deleteAccountModal));
  on(els.profileAccessClose, "click", () => closeModal(els.profileAccessModal));
  on(els.profileOtpClose, "click", () => closeModal(els.profileOtpModal));
  on(els.profileAccessForgot, "click", requestRecoveryOtp);
  on(els.profileOtpSubmit, "click", confirmProfileAccessOtp);
  on(els.recoverySubmit, "click", confirmRecoveryOtp);
  on(els.recoveryClose, "click", () => closeModal(els.recoveryModal));
  on(els.profileAccessSubmit, "click", async () => {
    const key = els.profileAccessKey.value.trim();
    if (!key) return showToast(t().toasts.needProfileKey);
    if (!hasValidPersonalKey(key)) return showToast(t().toasts.invalidKey);
    state.personalKey = key;
    sessionStorage.setItem("personalKey", key);
    state.profileAccessUnlocked = true;
    closeModal(els.profileAccessModal);
    switchScreen("profile");
    await loadProfile();
  });
  on(els.copyShareLink, "click", async () => {
    if (!els.shareLinkOutput.value) return;
    await navigator.clipboard.writeText(els.shareLinkOutput.value);
    showToast(t().toasts.shareCreated);
  });
  on(els.notesUnlockConfirm, "click", confirmUnlockNotes);
  on(els.notesUnlockClose, "click", () => closeModal(els.notesUnlockModal));
  on(els.shareKeyConfirm, "click", confirmShareSelectedNote);
  on(els.shareKeyClose, "click", () => closeModal(els.shareKeyModal));
}

initCommonEvents();
if (page === "home") initHomePage();
if (page === "login") initLoginPage();
if (page === "dashboard") initDashboardPage();
