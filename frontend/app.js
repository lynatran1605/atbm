const page = document.body.dataset.page || "home";
const byId = (id) => document.getElementById(id);
const on = (el, eventName, handler) => el && el.addEventListener(eventName, handler);

const state = {
  language: localStorage.getItem("diaryLanguage") || "vi",
  currentScreen: localStorage.getItem("diaryCurrentScreen") || "dashboard-home",
  token: localStorage.getItem("diaryToken") || "",
  user: JSON.parse(localStorage.getItem("diaryUser") || "null"),
  notes: [],
  trash: [],
  sharedByMe: [],
  sharedWithMe: [],
  selectedNoteId: null,
  selectedSharedNoteId: "",
  shareToken: "",
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
  calendarViewDate: new Date(),
  selectedCalendarDate: new Date().toISOString().split("T")[0],
  calendarNotes: {},
  rsaPrivateKeyVisible: false,
  sharedViewOrigin: "public",
  previousScreen: "dashboard-home",
  calendarAgendaExpanded: false,
};

if (!window.CryptoJS) throw new Error("CryptoJS failed to load. Check your internet connection or CDN access.");

const translations = {
  vi: {
    nav: { home: "Trang chủ", intro: "Giới thiệu", about: "Về chúng tôi", login: "Đăng nhập" },
    public: {
      homeKicker: "Personal diary space",
      homeTitle: "NIKKI",
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
      aboutTitle: "NIKKI được làm ra để việc viết riêng tư trở nên dễ chịu hơn.",
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
      text: "Tại đây bạn vẫn thấy tinh thần của NIKKI, nhưng phần chính sẽ tập trung cho đăng nhập, đăng ký và xác thực OTP.",
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
        profile: ["Thông tin cá nhân", "Cập nhật hồ sơ và khóa nhật ký dùng để giải mã."],
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
      needKey: "Cần nhập khóa nhật ký hoặc đăng nhập lại để mã hóa nội dung.",
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
      keyPrompt: "Nhập khóa nhật ký để giải mã nhật ký:",
      sharePrompt: "Nhập khóa kiểm thử để gửi kèm:",
      needShareKey: "Bạn cần nhập khóa kiểm thử để tạo link chia sẻ.",
      forgotPrompt: "Nhập email tài khoản:",
      forgotNewPasswordPrompt: "Nhập mật khẩu mới:",
      unlockRequiredForExisting: "Nhật ký cũ đang được giữ ở dạng mã hóa. Mở khóa trước để xem nội dung thật.",
      invalidKey: "Khóa nhật ký không đúng.",
      personalKeyOtpSent: "OTP đổi khóa nhật ký đã được gửi về email.",
      personalKeyUpdated: "Đã đổi khóa nhật ký và mã hóa lại ghi chú thành công.",
      needCurrentPersonalKey: "Bạn cần nhập khóa nhật ký hiện tại.",
      needNewPersonalKey: "Bạn cần nhập khóa nhật ký mới.",
      needCurrentPassword: "Bạn cần nhập mật khẩu hiện tại.",
      needOtp: "Bạn cần nhập OTP xác nhận đổi khóa.",
      needUnlockBeforeChange: "Hãy mở khóa toàn bộ ghi chú hiện tại trước khi đổi khóa nhật ký.",
      needUnlockBeforePasswordChange: "Hãy mở khóa toàn bộ note hiện tại trước khi đổi mật khẩu.",
      passwordChangeReencryptFailed: "Không thể đồng bộ note sang mật khẩu mới. Hãy mở khóa lại note hiện tại và thử lại.",
      sharedUnlockFailed: "Khóa kiểm thử không đúng hoặc nội dung không thể giải mã.",
      sharedUnlockSuccess: "Đã mở ghi chú được chia sẻ.",
      shareInfo: "Mỗi lần chia sẻ sẽ tạo một link mới và yêu cầu một khóa kiểm thử mới.",
      encryptedTitle: "Ghi chú đang mã hóa",
      searchPlaceholder: "Tìm theo tiêu đề sau khi mở khóa...",
      needProfileKey: "Bạn cần nhập khóa nhật ký để mở hồ sơ.",
      profileAccessOtpSent: "OTP mở hồ sơ đã được gửi về email.",
      profileAccessGranted: "Đã mở trang thông tin cá nhân.",
      recoveryOtpSent: "OTP cấp lại khóa nhật ký đã được gửi về email.",
      recoverySuccess: "Đã cấp lại khóa nhật ký và đổi mật khẩu mới thành công.",
      passwordOtpSent: "OTP đổi mật khẩu đã được gửi về email.",
      passwordUpdated: "Đã đổi mật khẩu đăng nhập thành công.",
      accountDeleteOtpSent: "OTP xóa tài khoản đã được gửi về email.",
      accountDeleted: "Tài khoản đã được đưa vào thùng rác 30 ngày.",
      needDeleteFields: "Bạn cần nhập mật khẩu hiện tại, khóa nhật ký hiện tại và OTP.",
      needPasswordFields: "Bạn cần nhập mật khẩu mới và OTP.",
      calendarLocked: "Lịch đang bị khóa. Mở khóa nhật ký để xem lịch.",
      apiJsonError: "API trả về dữ liệu không hợp lệ. Vui lòng thử lại.",
    },
  },
  en: {
    nav: { home: "Home", intro: "Introduction", about: "About", login: "Login" },
    public: {
      homeKicker: "Personal diary space",
      homeTitle: "NIKKI",
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
      aboutTitle: "NIKKI was built to make private writing feel calmer.",
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
      text: "This view keeps NIKKI's identity while focusing on sign in, sign up, and OTP verification.",
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
        profile: ["Profile", "Update your profile and journal key used for decryption."],
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
      needKey: "A journal key or a fresh login is required to encrypt content.",
      needUnlock: "Unlock the diary before viewing or editing older entries.",
      shareCreated: "Share link created and copied.",
      shareRemoved: "The shared note was removed from your list.",
      shareStopped: "Sharing for this note has been stopped.",
      shareUpdated: "Share access updated.",
      shareSaved: "Shared note changes saved.",
      needRecipient: "A recipient account is required to generate the encryption keys.",
      switchAccount: "Please sign in to a different account.",
      logout: "Logged out.",
      sharedLoadError: "Unable to load the shared note.",
      noNoteToShare: "Open a diary entry before sharing it.",
      keyPrompt: "Enter your journal key to decrypt diary entries:",
      sharePrompt: "Enter the test key to include:",
      needShareKey: "Enter a test key before creating a share link.",
      forgotPrompt: "Enter your account email:",
      forgotNewPasswordPrompt: "Enter your new password:",
      unlockRequiredForExisting: "Existing diary entries remain encrypted until you unlock them.",
      invalidKey: "The journal key is incorrect.",
      personalKeyOtpSent: "The journal key OTP has been sent to your email.",
      personalKeyUpdated: "The journal key was updated and notes were re-encrypted successfully.",
      needCurrentPersonalKey: "You need to enter your current journal key.",
      needNewPersonalKey: "You need to enter a new journal key.",
      needCurrentPassword: "You need to enter your current password.",
      needOtp: "You need to enter the OTP confirmation code.",
      needUnlockBeforeChange: "Unlock your current notes before changing the journal key.",
      needUnlockBeforePasswordChange: "Unlock your current notes before changing the password.",
      passwordChangeReencryptFailed: "Current notes could not be synced to the new password. Unlock them again and try once more.",
      sharedUnlockFailed: "The test key is incorrect or the content could not be decrypted.",
      sharedUnlockSuccess: "The shared note has been unlocked.",
      shareInfo: "Each share is automatically protected with Hybrid RSA and AES encryption.",
      encryptedTitle: "Encrypted note",
      searchPlaceholder: "Search titles after unlocking...",
      needProfileKey: "You need to enter the journal key to open the profile.",
      profileAccessOtpSent: "The profile access OTP has been sent to your email.",
      profileAccessGranted: "The profile page is now unlocked.",
      recoveryOtpSent: "The journal key recovery OTP has been sent to your email.",
      recoverySuccess: "Your journal key was reissued and your password was updated successfully.",
      passwordOtpSent: "The password change OTP has been sent to your email.",
      passwordUpdated: "The login password has been updated successfully.",
      accountDeleteOtpSent: "The account deletion OTP has been sent to your email.",
      accountDeleted: "The account has been moved to trash for 30 days.",
      needDeleteFields: "Enter your current password, current journal key, and OTP.",
      needPasswordFields: "Enter the new password and OTP.",
      calendarLocked: "Calendar is locked. Unlock diary to view calendar.",
      apiJsonError: "The API returned an invalid response. Please try again.",
    },
  },
};

const BRAND_NAME = "NIKKI";

translations.vi.nav = {
  home: "Trang chủ",
  intro: "Tính năng",
  about: "Về chúng tôi",
  login: "Đăng nhập",
};

translations.en.nav = {
  home: "Home",
  intro: "Features",
  about: "About Us",
  login: "Login",
};

Object.assign(translations.vi.public, {
  homeTitle: BRAND_NAME,
  homeKicker: "Không gian nhật ký hiện đại",
  homeText:
    "NIKKI là nơi giúp bạn ghi lại suy nghĩ, quản lý ghi chú và cảm nhận rõ giá trị của sản phẩm ngay từ trang đầu tiên trước khi đăng nhập.",
  heroLogin: "Đăng nhập",
  tags: ["Giao diện hiện đại", "Chuyển động mượt", "Nhật ký riêng tư"],
  introKicker: "Tính năng",
  introTitle: "Trang giới thiệu trước khi đăng nhập mang phong cách sản phẩm công nghệ hiện đại.",
  introCards: [
    {
      title: "Điểm bắt đầu rõ ràng",
      text: "Người dùng chưa đăng nhập sẽ vào trang giới thiệu thay vì đi thẳng vào bảng điều khiển.",
    },
    {
      title: "Trình chiếu tính năng",
      text: "Ảnh màn hình bảng điều khiển được đặt trong một thanh trượt ngang duy nhất với chuyển động mượt.",
    },
    {
      title: "Bố cục gọn gàng",
      text: "Thanh điều hướng, phần giới thiệu nhóm và chân trang được sắp xếp rõ ràng, dễ nhìn và cân đối.",
    },
  ],
  aboutKicker: "Về chúng tôi",
  aboutTitle: "NIKKI được xây dựng để việc viết và quản lý nhật ký trở nên trực quan hơn.",
  aboutText:
    "Trang giới thiệu mới tập trung vào trải nghiệm rõ ràng, khoảng trắng đẹp và các khối nội dung cân đối để người dùng hiểu sản phẩm trước khi sử dụng bảng điều khiển.",
  aboutStats: [
    "Điều hướng luôn hiển thị khi cuộn trang.",
    "Trình chiếu ngang giúp giới thiệu nhanh các màn hình bảng điều khiển.",
    "Giao diện đáp ứng tốt trên cả máy tính và điện thoại.",
  ],
});

Object.assign(translations.en.public, {
  homeTitle: BRAND_NAME,
  homeKicker: "Modern journaling product",
  homeText:
    "NIKKI helps users understand the product before login through a polished landing page with clear structure, refined motion, and a focused private-journal message.",
  heroLogin: "Login",
  tags: ["Modern interface", "Smooth motion", "Private journaling"],
  introKicker: "Features",
  introTitle: "A pre-login landing page with the feel of a modern technology product.",
  introCards: [
    {
      title: "A clearer entry point",
      text: "Logged-out users now land on a homepage instead of being sent directly to the dashboard.",
    },
    {
      title: "A feature carousel",
      text: "Dashboard screenshots live inside one horizontal slider with smooth transitions and focused presentation.",
    },
    {
      title: "A cleaner layout",
      text: "Navigation, team introduction, and footer sections are spaced and balanced like a polished product site.",
    },
  ],
  aboutKicker: "About Us",
  aboutTitle: "NIKKI is designed to make journaling and note management feel more intuitive.",
  aboutText:
    "The refreshed landing page focuses on clarity, generous spacing, and balanced content blocks so visitors understand the product before entering the dashboard.",
  aboutStats: [
    "The navigation bar stays visible while scrolling.",
    "A single horizontal slider introduces key dashboard screens.",
    "The layout adapts cleanly across desktop and mobile sizes.",
  ],
});

Object.assign(translations.vi.auth, {
  title: "Đăng nhập vào NIKKI để tiếp tục sử dụng bảng điều khiển hiện có.",
  text: "Luồng đăng nhập và chức năng bảng điều khiển được giữ nguyên. Người dùng chưa đăng nhập sẽ thấy trang giới thiệu trước.",
  tags: ["Đăng nhập an toàn", "Giữ nguyên chức năng", "Kết nối liền mạch"],
});

Object.assign(translations.en.auth, {
  title: "Log in to NIKKI to continue using the existing dashboard.",
  text: "The authentication flow and dashboard functionality stay intact. Logged-out users now see the landing page first.",
  tags: ["Secure access", "Existing dashboard", "Seamless flow"],
});

Object.assign(translations.vi.dashboard.screens, {
  profile: ["Thông tin cá nhân", "Cập nhật hồ sơ và khóa nhật ký dùng để giải mã."],
});

Object.assign(translations.en.dashboard.screens, {
  profile: ["Profile", "Update your profile and journal key used for decryption."],
});

Object.assign(translations.vi.toasts, {
  needKey: "Cần nhập khóa nhật ký hoặc đăng nhập lại để mã hóa nội dung.",
  keyPrompt: "Nhập khóa nhật ký để giải mã nhật ký:",
  invalidKey: "Khóa nhật ký không đúng.",
  personalKeyOtpSent: "OTP đổi khóa nhật ký đã được gửi về email.",
  personalKeyUpdated: "Đã đổi khóa nhật ký và mã hóa lại ghi chú thành công.",
  needCurrentPersonalKey: "Bạn cần nhập khóa nhật ký hiện tại.",
  needNewPersonalKey: "Bạn cần nhập khóa nhật ký mới.",
  needUnlockBeforeChange: "Hãy mở khóa toàn bộ ghi chú hiện tại trước khi đổi khóa nhật ký.",
  needProfileKey: "Bạn cần nhập khóa nhật ký để mở hồ sơ.",
  recoveryOtpSent: "OTP cấp lại khóa nhật ký đã được gửi về email.",
  recoverySuccess: "Đã cấp lại khóa nhật ký và đổi mật khẩu mới thành công.",
  needDeleteFields: "Bạn cần nhập mật khẩu hiện tại, khóa nhật ký hiện tại và OTP.",
});

Object.assign(translations.en.toasts, {
  needKey: "A journal key or a fresh login is required to encrypt content.",
  keyPrompt: "Enter your journal key to decrypt diary entries:",
  invalidKey: "The journal key is incorrect.",
  personalKeyOtpSent: "The journal key OTP has been sent to your email.",
  personalKeyUpdated: "The journal key was updated and notes were re-encrypted successfully.",
  needCurrentPersonalKey: "You need to enter your current journal key.",
  needNewPersonalKey: "You need to enter a new journal key.",
  needUnlockBeforeChange: "Unlock your current notes before changing the journal key.",
  needProfileKey: "You need to enter the journal key to open the profile.",
  recoveryOtpSent: "The journal key recovery OTP has been sent to your email.",
  recoverySuccess: "Your journal key was reissued and your password was updated successfully.",
  needDeleteFields: "Enter your current password, current journal key, and OTP.",
});

const landingContent = {
  vi: {
    introTextMain:
      "NIKKI mở đầu bằng một phần giới thiệu ngắn gọn để người dùng hiểu ngay sản phẩm đang làm gì, dành cho ai và vì sao nên đăng nhập để tiếp tục sử dụng.",
    introTextSub:
      "Ngay bên dưới là thanh trượt ngang duy nhất dùng ảnh mẫu trong dự án để giới thiệu các khu vực chính của bảng điều khiển bằng chuyển động mượt và hiện đại.",
    previewKicker: "Giới thiệu tính năng",
    previewTitle: "Thanh trượt ngang giúp xem nhanh các màn hình nổi bật của bảng điều khiển.",
    previewText:
      "Mỗi lần bấm mũi tên, ảnh sẽ trượt sang mục tiếp theo. Tại một thời điểm chỉ có một ảnh chính được hiển thị rõ ràng.",
    previewLabels: ["Tổng quan", "Lập kế hoạch", "Bảo mật"],
    previewTitles: [
      "Bảng điều khiển tổng quan để xem nhanh ghi chú, hoạt động gần đây và các lối tắt quan trọng.",
      "Khu vực hỗ trợ theo dõi lịch và tổ chức công việc hằng ngày gọn gàng hơn.",
      "Màn hình quản lý hồ sơ và quyền riêng tư để kiểm soát tài khoản an toàn hơn.",
    ],
    previewTexts: [
      "Ảnh mẫu này có thể được thay bằng ảnh chụp bảng điều khiển thật sau này.",
      "Tất cả ảnh đều nằm trong cùng một thanh trượt thay vì tách thành nhiều phần riêng.",
      "Phần giới thiệu này nhấn mạnh khả năng bảo mật và quản lý tài khoản của sản phẩm.",
    ],
    backgroundCredit: "Nguồn ảnh nền: Unsplash",
    footerEmailLabel: "Email:",
    footerPhoneLabel: "Điện thoại:",
    footerAboutLabel: "Về chúng tôi:",
    footerAboutText:
      "Nhóm xây dựng NIKKI với mục tiêu tạo ra một không gian nhật ký riêng tư, gọn gàng và dễ tiếp cận hơn cho người dùng.",
  },
  en: {
    introTextMain:
      "NIKKI opens with a concise introduction that explains what the product does, who it serves, and why the dashboard matters before the user logs in.",
    introTextSub:
      "Right below it, one horizontal slider uses placeholder images from the project to showcase the key dashboard areas with smooth modern motion.",
    previewKicker: "Feature Introduction",
    previewTitle: "A horizontal slider for a quick tour of the most important dashboard views.",
    previewText:
      "Each arrow click moves to the next feature smoothly, while keeping a single main image in focus at any moment.",
    previewLabels: ["Overview", "Planning", "Security"],
    previewTitles: [
      "A main overview screen for notes, recent activity, and important shortcuts.",
      "A planning-focused area that supports calendar visibility and daily organization.",
      "A profile and privacy area for safer account and access management.",
    ],
    previewTexts: [
      "This placeholder image can be replaced later with a real dashboard screenshot.",
      "All feature images stay inside one slider instead of becoming separate full sections.",
      "This feature highlight reinforces the product's privacy and account-control story.",
    ],
    backgroundCredit: "Background source: Unsplash",
    footerEmailLabel: "Email:",
    footerPhoneLabel: "Phone:",
    footerAboutLabel: "About Us:",
    footerAboutText:
      "The team built NIKKI to create a cleaner, more approachable, and more private journaling experience for users.",
  },
};

const els = {
  publicShareTopbar: byId("public-share-topbar"),
  shareBrandHome: byId("share-brand-home"),
  shareTopbarLogin: byId("share-topbar-login"),
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
  introTextMain: byId("intro-text-main"),
  introTextSub: byId("intro-text-sub"),
  aboutKicker: byId("about-kicker"),
  aboutTitle: byId("about-title"),
  aboutText: byId("about-text"),
  aboutStat1: byId("about-stat-1"),
  aboutStat2: byId("about-stat-2"),
  aboutStat3: byId("about-stat-3"),
  previewKicker: byId("preview-kicker"),
  previewTitle: byId("preview-title"),
  previewText: byId("preview-text"),
  previewLabel1: byId("preview-label-1"),
  previewLabel2: byId("preview-label-2"),
  previewLabel3: byId("preview-label-3"),
  previewCardTitle1: byId("preview-card-title-1"),
  previewCardTitle2: byId("preview-card-title-2"),
  previewCardTitle3: byId("preview-card-title-3"),
  previewCardText1: byId("preview-card-text-1"),
  previewCardText2: byId("preview-card-text-2"),
  previewCardText3: byId("preview-card-text-3"),
  backgroundCredit: byId("background-credit"),
  footerEmailLabel: byId("footer-email-label"),
  footerPhoneLabel: byId("footer-phone-label"),
  footerAboutLabel: byId("footer-about-label"),
  footerAboutText: byId("footer-about-text"),
  previewPrev: byId("preview-prev"),
  previewNext: byId("preview-next"),
  showcaseTrack: byId("showcase-track"),
  showcaseSlides: Array.from(document.querySelectorAll(".showcase-slide")),
  showcaseDots: Array.from(document.querySelectorAll(".showcase-dot")),
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
  loginIdentifierError: byId("login-identifier-error"),
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
  registerUsernameError: byId("register-username-error"),
  registerEmail: byId("register-email"),
  registerPassword: byId("register-password"),
  registerSubmit: byId("register-submit"),
  loginPrompt: byId("login-prompt"),
  goLogin: byId("go-login"),
  authTabLogin: byId("auth-tab-login"),
  authTabRegister: byId("auth-tab-register"),
  authTabOtp: byId("auth-tab-otp"),
  otpHeading: byId("otp-heading"),
  otpText: byId("otp-text"),
  otpCode: byId("otp-code"),
  otpNewPasswordField: byId("otp-new-password-field"),
  otpNewPasswordLabel: byId("otp-new-password-label"),
  otpNewPassword: byId("otp-new-password"),
  otpResend: byId("otp-resend"),
  otpSubmit: byId("otp-submit"),
  sideButtons: Array.from(document.querySelectorAll(".side-btn")),
  topScreenButtons: Array.from(document.querySelectorAll(".top-screen-btn")),
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
  notesToolbarKey: byId("notes-toolbar-key"),
  unlockNotes: byId("unlock-notes"),
  notesSecurityHint: byId("notes-security-hint"),
  notesList: byId("notes-list"),
  trashList: byId("trash-list"),
  noteTitle: byId("note-title"),
  noteEditor: byId("note-editor"),
  fontSizeSelect: byId("font-size-select"),
  fontFamilySelect: byId("font-family-select"),
  fontColorInput: byId("font-color"),
  highlightColorInput: byId("highlight-color"),
  clearFormat: byId("clear-format"),
  downloadWord: byId("download-word"),
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
  noteModal: byId("note-modal"),
  noteModalClose: byId("note-modal-close"),
  sharedWithMeList: byId("shared-with-me-list"),
  sharedByMeList: byId("shared-by-me-list"),
  profileDisplayName: byId("profile-display-name"),
  profileUsername: byId("profile-username"),
  profileBirthDate: byId("profile-birth-date"),
  profileEmail: byId("profile-email"),
  profileGender: byId("profile-gender"),
  rsaKeyStatus: byId("rsa-key-status"),
  securityPublicKey: byId("security-public-key"),
  securityPrivateKey: byId("security-private-key"),
  showPrivateKey: byId("show-private-key"),
  copyPrivateKey: byId("copy-private-key"),
  downloadPrivateKey: byId("download-private-key"),
  regenerateKeyPair: byId("regenerate-key-pair"),
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
  securityOptionRsa: byId("security-option-rsa"),
  securityOptionPassword: byId("security-option-password"),
  securityOptionKey: byId("security-option-key"),
  securityOptionDelete: byId("security-option-delete"),
  securityKeypairModal: byId("security-keypair-modal"),
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
  shareKeyModal: byId("share-key-modal"),
  shareEncryptionType: byId("share-encryption-type"),
  shareSymmetricField: byId("share-symmetric-field"),
  sharePublicKeyField: byId("share-public-key-field"),
  shareTestKey: byId("share-test-key"),
  shareRecipientInput: byId("share-recipient-input"),
  shareKeyConfirm: byId("share-key-confirm"),
  shareKeyClose: byId("share-key-close"),
  securityKeypairClose: byId("security-keypair-close"),
  toast: byId("toast"),
  sharedNoteTitle: byId("shared-note-title"),
  sharedNoteTitleInput: byId("shared-note-title-input"),
  sharedNoteKey: byId("shared-note-key"),
  sharedNoteAccessKey: byId("shared-note-access-key"),
  sharedNoteUnlock: byId("shared-note-unlock"),
  sharedNoteSave: byId("shared-note-save"),
  sharedNoteEditor: byId("shared-note-editor"),
  sharedToolbar: byId("shared-toolbar"),
  sharedViewClose: byId("shared-view-close"),
  shareAuthGate: byId("share-auth-gate"),
  shareAuthTitle: byId("share-auth-title"),
  shareAuthText: byId("share-auth-text"),
  shareLoginIdentifierLabel: byId("share-login-identifier-label"),
  shareLoginPasswordLabel: byId("share-login-password-label"),
  shareLoginIdentifier: byId("share-login-identifier"),
  shareLoginPassword: byId("share-login-password"),
  shareLoginSubmit: byId("share-login-submit"),
  sharedFontSizeSelect: byId("shared-font-size-select"),
  sharedFontFamilySelect: byId("shared-font-family-select"),
  sharedFontColor: byId("shared-font-color"),
  sharedHighlightColor: byId("shared-highlight-color"),
  sharedClearFormat: byId("shared-clear-format"),
  calendarMonthPicker: byId("calendar-month-picker"),
  calendarMonthInline: byId("calendar-month-inline"),
  calendarYearInline: byId("calendar-year-inline"),
  calendarOpenPicker: byId("calendar-open-picker"),
  calendarMonthLabel: byId("calendar-month-label"),
  calendarGrid: byId("calendar-grid"),
  calendarSelectedDate: byId("calendar-selected-date"),
  calendarNoteInput: byId("calendar-note-input"),
  calendarSaveNote: byId("calendar-save-note"),
  calendarClearNote: byId("calendar-clear-note"),
  calendarAgendaTitle: byId("calendar-agenda-title"),
  calendarAgendaText: byId("calendar-agenda-text"),
  calendarAgendaToggle: byId("calendar-agenda-toggle"),
  calendarAgendaList: byId("calendar-agenda-list"),
  calendarYearSelect: byId("calendar-year-select"),
  calendarMonthSelect: byId("calendar-month-select"),
  calendarPrev: byId("calendar-prev"),
  calendarNext: byId("calendar-next"),
  calendarSelectMonth: byId("calendar-select-month"),
  calendarControlsModal: byId("calendar-controls-modal"),
  calendarControlsClose: byId("calendar-controls-close"),
  calendarControlsApply: byId("calendar-controls-apply"),
};

function t() { return translations[state.language]; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
let loadingCount = 0;

function ensureLoadingOverlay() {
  let overlay = byId("loading-overlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.className = "loading-overlay hidden";
  overlay.innerHTML = `
    <div class="loading-card">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p id="loading-text" class="loading-text"></p>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function syncLoadingText() {
  const loadingText = byId("loading-text");
  if (loadingText) loadingText.textContent = state.language === "vi" ? "Đang tải..." : "Loading...";
}

function startLoading() {
  loadingCount += 1;
  const overlay = ensureLoadingOverlay();
  syncLoadingText();
  overlay.classList.remove("hidden");
}

function stopLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  const overlay = ensureLoadingOverlay();
  if (loadingCount === 0) overlay.classList.add("hidden");
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast && els.toast.classList.add("hidden"), 3000);
}

function getCalendarStorageKey() {
  const userKey = state.user?.id || state.user?.uid || state.user?.username || "guest";
  return `bloomnote-calendar:${userKey}`;
}

function loadCalendarNotes() {
  try {
    state.calendarNotes = JSON.parse(localStorage.getItem(getCalendarStorageKey()) || "{}");
  } catch {
    state.calendarNotes = {};
  }
}

function saveCalendarNotes() {
  localStorage.setItem(getCalendarStorageKey(), JSON.stringify(state.calendarNotes));
}

function formatCalendarDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCalendarLabel(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(state.language === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getCalendarMonthOptions() {
  if (state.language === "vi") {
    return Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`);
  }
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}

function syncCalendarSelectors() {
  const monthSelect = els.calendarMonthInline;
  const yearSelect = els.calendarYearInline;
  if (!monthSelect || !yearSelect) return;

  const viewDate = new Date(state.calendarViewDate);
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const monthLabels = getCalendarMonthOptions();

  monthSelect.innerHTML = monthLabels
    .map((label, index) => `<option value="${index}">${escapeHtml(label)}</option>`)
    .join("");

  const years = [];
  for (let year = currentYear - 8; year <= currentYear + 8; year += 1) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  yearSelect.innerHTML = years.join("");

  monthSelect.value = `${currentMonth}`;
  yearSelect.value = `${currentYear}`;

  if (els.calendarMonthSelect) {
    els.calendarMonthSelect.innerHTML = monthLabels
      .map((label, index) => `<option value="${index}">${escapeHtml(label)}</option>`)
      .join("");
    els.calendarMonthSelect.value = `${currentMonth}`;
  }
  if (els.calendarYearSelect) {
    els.calendarYearSelect.innerHTML = years.join("");
    els.calendarYearSelect.value = `${currentYear}`;
  }
}

function getCalendarAgendaItems() {
  const viewDate = new Date(state.calendarViewDate);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = formatCalendarDate(new Date());

  const entries = Object.entries(state.calendarNotes)
    .filter(([, note]) => String(note || "").trim())
    .map(([date, note]) => ({ date, note: String(note).trim(), parsedDate: new Date(date) }))
    .filter((item) => item.parsedDate.getFullYear() === year && item.parsedDate.getMonth() === month);

  entries.sort((a, b) => {
    const aUpcoming = a.date >= today ? 0 : 1;
    const bUpcoming = b.date >= today ? 0 : 1;
    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
    return a.date.localeCompare(b.date);
  });

  return entries;
}

function renderCalendarAgenda() {
  if (!els.calendarAgendaList || !els.calendarAgendaToggle) return;
  const items = getCalendarAgendaItems();
  const isVi = state.language === "vi";
  const visibleItems = state.calendarAgendaExpanded ? items : items.slice(0, 5);

  if (!items.length) {
    els.calendarAgendaList.innerHTML = `<div class="calendar-agenda-empty">${escapeHtml(isVi ? "Chưa có nhắc hẹn nào trong tháng này." : "No reminders in this month yet.")}</div>`;
    els.calendarAgendaToggle.classList.add("hidden");
    return;
  }

  els.calendarAgendaList.innerHTML = visibleItems.map((item) => `
    <button class="calendar-agenda-item${item.date === state.selectedCalendarDate ? " is-active" : ""}" type="button" data-calendar-agenda-date="${item.date}">
      <span class="calendar-agenda-date">${escapeHtml(formatCalendarLabel(item.date))}</span>
      <span class="calendar-agenda-note">${escapeHtml(item.note)}</span>
    </button>
  `).join("");

  els.calendarAgendaList.querySelectorAll("[data-calendar-agenda-date]").forEach((button) => on(button, "click", () => {
    state.selectedCalendarDate = button.dataset.calendarAgendaDate;
    renderCalendarWidget();
  }));

  if (items.length > 5) {
    els.calendarAgendaToggle.classList.remove("hidden");
    els.calendarAgendaToggle.textContent = state.calendarAgendaExpanded
      ? (isVi ? "Rút gọn" : "Show less")
      : (isVi ? "Xem thêm" : "View more");
  } else {
    els.calendarAgendaToggle.classList.add("hidden");
  }
}

function renderCalendarWidget() {
  if (!els.calendarGrid || !els.calendarMonthLabel) return;

  if (!state.notesUnlocked) {
    els.calendarMonthLabel.textContent = t().toasts.needUnlock;
    els.calendarGrid.innerHTML = `<div class="calendar-locked">${t().toasts.calendarLocked}</div>`;
    if (els.calendarMonthPicker) els.calendarMonthPicker.value = "";
    if (els.calendarSelectedDate) els.calendarSelectedDate.textContent = "--";
    if (els.calendarNoteInput) els.calendarNoteInput.value = "";
    if (els.calendarAgendaList) els.calendarAgendaList.innerHTML = "";
    if (els.calendarAgendaToggle) els.calendarAgendaToggle.classList.add("hidden");
    return;
  }

  const viewDate = new Date(state.calendarViewDate);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7;
  const today = formatCalendarDate(new Date());

  els.calendarMonthLabel.textContent = viewDate.toLocaleDateString(state.language === "vi" ? "vi-VN" : "en-US", {
    month: state.language === "vi" ? "long" : "short",
    year: "numeric",
  });
  syncCalendarSelectors();

  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const cellDate = new Date(year, month, index - startOffset + 1);
    const dateValue = formatCalendarDate(cellDate);
    const isOutside = cellDate.getMonth() !== month;
    const isToday = dateValue === today;
    const isSelected = dateValue === state.selectedCalendarDate;
    const hasNote = Boolean(state.calendarNotes[dateValue]?.trim());
    cells.push(`<button class="calendar-day${isOutside ? " is-outside" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${hasNote ? " has-note" : ""}" type="button" data-calendar-date="${dateValue}">${cellDate.getDate()}</button>`);
  }

  els.calendarGrid.innerHTML = cells.join("");
  if (els.calendarSelectedDate) els.calendarSelectedDate.textContent = formatCalendarLabel(state.selectedCalendarDate);
  if (els.calendarNoteInput) els.calendarNoteInput.value = state.calendarNotes[state.selectedCalendarDate] || "";
  els.calendarGrid.querySelectorAll("[data-calendar-date]").forEach((button) => on(button, "click", () => {
    state.selectedCalendarDate = button.dataset.calendarDate;
    renderCalendarWidget();
  }));
  renderCalendarAgenda();
}
function renderTagList(container, items) { if (container) container.innerHTML = items.map((item) => `<span>${escapeHtml(item)}</span>`).join(""); }
let homeShowcaseIndex = 0;

function renderLandingExtras() {
  const copy = landingContent[state.language];
  if (!copy) return;
  if (els.introTextMain) els.introTextMain.textContent = copy.introTextMain;
  if (els.introTextSub) els.introTextSub.textContent = copy.introTextSub;
  if (els.previewKicker) els.previewKicker.textContent = copy.previewKicker;
  if (els.previewTitle) els.previewTitle.textContent = copy.previewTitle;
  if (els.previewText) els.previewText.textContent = copy.previewText;
  if (els.previewLabel1) els.previewLabel1.textContent = copy.previewLabels[0];
  if (els.previewLabel2) els.previewLabel2.textContent = copy.previewLabels[1];
  if (els.previewLabel3) els.previewLabel3.textContent = copy.previewLabels[2];
  if (els.previewCardTitle1) els.previewCardTitle1.textContent = copy.previewTitles[0];
  if (els.previewCardTitle2) els.previewCardTitle2.textContent = copy.previewTitles[1];
  if (els.previewCardTitle3) els.previewCardTitle3.textContent = copy.previewTitles[2];
  if (els.previewCardText1) els.previewCardText1.textContent = copy.previewTexts[0];
  if (els.previewCardText2) els.previewCardText2.textContent = copy.previewTexts[1];
  if (els.previewCardText3) els.previewCardText3.textContent = copy.previewTexts[2];
  if (els.backgroundCredit) els.backgroundCredit.textContent = copy.backgroundCredit;
  if (els.footerEmailLabel) els.footerEmailLabel.textContent = copy.footerEmailLabel;
  if (els.footerPhoneLabel) els.footerPhoneLabel.textContent = copy.footerPhoneLabel;
  if (els.footerAboutLabel) els.footerAboutLabel.textContent = copy.footerAboutLabel;
  if (els.footerAboutText) els.footerAboutText.textContent = copy.footerAboutText;
}

function renderHomeShowcase(index = 0) {
  if (!els.showcaseSlides.length) return;
  const maxIndex = els.showcaseSlides.length - 1;
  homeShowcaseIndex = index < 0 ? maxIndex : index > maxIndex ? 0 : index;
  if (els.showcaseTrack) els.showcaseTrack.style.transform = `translateX(-${homeShowcaseIndex * 100}%)`;
  els.showcaseSlides.forEach((slide, slideIndex) => slide.classList.toggle("active", slideIndex === homeShowcaseIndex));
  els.showcaseDots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === homeShowcaseIndex));
}

function initHomeShowcase() {
  if (!els.showcaseSlides.length) return;
  renderHomeShowcase(homeShowcaseIndex);
  on(els.previewPrev, "click", () => renderHomeShowcase(homeShowcaseIndex - 1));
  on(els.previewNext, "click", () => renderHomeShowcase(homeShowcaseIndex + 1));
  els.showcaseDots.forEach((dot) => on(dot, "click", () => renderHomeShowcase(Number(dot.dataset.slideTarget || 0))));
}

function goToHome(section = "") { window.location.href = `/index.html${section ? `#${section}` : ""}`; }
function goToLogin(newTab = false) {
  const targetUrl = "/login.html";
  if (newTab) {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    return;
  }
  window.location.href = targetUrl;
}
function goToDashboard(hash = "") { window.location.href = `/dashboard.html${hash}`; }

function persistCurrentScreen(screenId) {
  if (!screenId || screenId === "share-view") return;
  localStorage.setItem("diaryCurrentScreen", screenId);
}

function getHomePrimaryActionLabel() {
  return state.language === "vi" ? "Đăng nhập" : "Login";
}

function hasStoredLogin() {
  return Boolean(state.token && state.user);
}

function hasActiveSession() {
  return Boolean(state.token && state.user && state.hasAuthenticatedInSession);
}

function normalizeUsername(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername(value = "") {
  return /^[a-z0-9_]{4,32}$/.test(normalizeUsername(value));
}

function isValidLoginIdentifier(value = "") {
  return /^[a-z0-9@._-]+$/.test(String(value || "").trim());
}

function setFieldError(element, message = "") {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function getLoginIdentifierRuleMessage() {
  return state.language === "vi"
    ? "Chỉ có thể đăng nhập bằng chữ thường không dấu, số và các ký tự như @ . _ -"
    : "Use lowercase letters, numbers, and characters like @ . _ - only.";
}

function getRegisterUsernameRuleMessage() {
  return state.language === "vi"
    ? "Tên người dùng chỉ dùng chữ thường không dấu, số hoặc dấu gạch dưới, dài 4-32 ký tự."
    : "Username must use 4-32 lowercase letters, numbers, or underscores only.";
}

function validateLoginIdentifierField() {
  const value = els.loginIdentifier?.value || "";
  const trimmed = value.trim();
  if (!trimmed) {
    setFieldError(els.loginIdentifierError, "");
    return true;
  }
  const valid = !/\s/.test(value) && isValidLoginIdentifier(trimmed);
  setFieldError(els.loginIdentifierError, valid ? "" : getLoginIdentifierRuleMessage());
  return valid;
}

function validateRegisterUsernameField() {
  const value = els.registerUsername?.value || "";
  const trimmed = value.trim();
  if (!trimmed) {
    setFieldError(els.registerUsernameError, "");
    return true;
  }
  const valid = !/\s/.test(value) && /^[a-z0-9_]{4,32}$/.test(trimmed);
  setFieldError(els.registerUsernameError, valid ? "" : getRegisterUsernameRuleMessage());
  return valid;
}

function hasStoredPrivateKeyForCurrentUser() {
  return Boolean(getStoredPrivateKey());
}

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
  const isVi = state.language === "vi";
  document.documentElement.lang = state.language;
  localStorage.setItem("diaryLanguage", state.language);
  syncLoadingText();
  if (els.languageToggle) els.languageToggle.textContent = state.language === "vi" ? "EN" : "VN";
  els.navButtons.forEach((button) => {
    const section = button.dataset.section;
    if (section === "home") button.textContent = copy.nav.home;
    if (section === "features" || section === "intro") button.textContent = copy.nav.intro;
    if (section === "about") button.textContent = copy.nav.about;
  });
  if (els.navLogin) els.navLogin.textContent = hasStoredLogin() ? (isVi ? "Vào dashboard" : "Dashboard") : copy.nav.login;
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
  renderLandingExtras();
  if (els.navLogin) els.navLogin.textContent = copy.nav.login;
  if (els.heroLogin) els.heroLogin.textContent = getHomePrimaryActionLabel();
  if (page === "login") {
    if (els.authKicker) els.authKicker.textContent = copy.auth.kicker;
    if (els.authTitle) els.authTitle.textContent = copy.auth.title;
    if (els.authText) els.authText.textContent = copy.auth.text;
    if (els.authBackHome) els.authBackHome.textContent = copy.auth.backHome;
    renderTagList(els.authTags, copy.auth.tags);
    if (els.loginHeading) els.loginHeading.textContent = copy.auth.loginHeading;
    if (els.loginIdentifierLabel) els.loginIdentifierLabel.textContent = copy.auth.loginIdentifierLabel;
    if (els.loginPasswordLabel) els.loginPasswordLabel.textContent = copy.auth.loginPasswordLabel;
    if (els.loginSubmit) els.loginSubmit.textContent = copy.auth.loginSubmit;
    if (els.forgotPassword) els.forgotPassword.textContent = copy.auth.forgotPassword;
    if (els.registerPrompt) els.registerPrompt.textContent = copy.auth.registerPrompt;
    if (els.goRegister) els.goRegister.textContent = copy.auth.goRegister;
    if (els.registerHeading) els.registerHeading.textContent = copy.auth.registerHeading;
    if (els.registerUsernameLabel) els.registerUsernameLabel.textContent = copy.auth.registerUsernameLabel;
    if (els.registerEmailLabel) els.registerEmailLabel.textContent = copy.auth.registerEmailLabel;
    if (els.registerPasswordLabel) els.registerPasswordLabel.textContent = copy.auth.registerPasswordLabel;
    if (els.registerSubmit) els.registerSubmit.textContent = copy.auth.registerSubmit;
    if (els.loginPrompt) els.loginPrompt.textContent = copy.auth.loginPrompt;
    if (els.goLogin) els.goLogin.textContent = copy.auth.goLogin;
    if (els.otpSubmit) els.otpSubmit.textContent = copy.auth.otpSubmit;
    if (els.togglePassword) els.togglePassword.textContent = copy.auth.toggleShow;
    if (els.loginIdentifier) els.loginIdentifier.placeholder = "you@example.com";
    if (els.loginPassword) els.loginPassword.placeholder = "********";
    if (els.registerUsername) els.registerUsername.placeholder = state.language === "vi" ? "vi_du123" : "example_123";
    validateLoginIdentifierField();
    validateRegisterUsernameField();
    renderOtpCardContent();
  }
  if (page === "dashboard") {
    updateStaticDashboardCopy();
    renderDashboardStats();
    updateUnlockStateUI();
    renderCalendarWidget();
    switchScreen(state.currentScreen);
  }
}

function updateStaticDashboardCopy() {
  if (page !== "dashboard") return;
  const isVi = state.language === "vi";
  const textMap = {
    "sidebar-note": isVi ? "Không gian riêng cho viết, lưu và quản lý nhật ký cá nhân." : "A private space for writing, saving, and managing your personal diary.",
    "sidebar-footer-title": isVi ? "Riêng tư trước tiên" : "Privacy first",
    "sidebar-footer-text": isVi ? "Nội dung chỉ hiển thị rõ sau khi bạn chủ động mở khóa." : "Content becomes readable only after you choose to unlock it.",
    "side-dashboard-home": isVi ? "Trang chủ" : "Home",
    "side-calendar": isVi ? "Lịch" : "Calendar",
    "side-notes": isVi ? "Nhật ký" : "Diary",
    "side-shared-notes": isVi ? "Nhật ký được chia sẻ" : "Shared diary",
    "side-trash": isVi ? "Thùng rác" : "Trash",
    "top-dashboard-home": isVi ? "Trang chủ" : "Home",
    "top-calendar": isVi ? "Lịch" : "Calendar",
    "top-notes": isVi ? "Nhật ký" : "Diary",
    "top-shared-notes": isVi ? "Chia sẻ" : "Shared",
    "top-trash": isVi ? "Thùng rác" : "Trash",
    "welcome-title": isVi ? "Không gian viết dành cho bạn" : "A writing space made for you",
    "welcome-text": isVi ? "NIKKI giúp bạn giữ nhịp viết riêng tư gọn gàng hơn: mở note nhanh, quản lý nội dung mã hóa và quay lại những ghi chú quan trọng bất cứ lúc nào." : "NIKKI keeps private writing simpler: open notes quickly, manage encrypted content, and return to important entries anytime.",
    "welcome-open-notes": isVi ? "Mở khu nhật ký" : "Open diary",
    "welcome-open-shares": isVi ? "Xem chia sẻ" : "Open shares",
    "summary-active-label": isVi ? "Nhật ký đang hoạt động" : "Active entries",
    "summary-trash-label": isVi ? "Trong thùng rác" : "In trash",
    "summary-key-label": isVi ? "Trạng thái mở khóa" : "Unlock status",
    "activity-title": isVi ? "Nhịp làm việc" : "Workflow",
    "activity-text": isVi ? "Theo dõi viết, khôi phục và chia sẻ gọn hơn." : "A cleaner flow for writing, restoring, and sharing.",
    "activity-item-1-title": isVi ? "Tạo hoặc mở note nhanh" : "Create or open notes fast",
    "activity-item-1-text": isVi ? "Vào khu nhật ký để viết, sửa và lưu." : "Go to the diary area to write, edit, and save.",
    "activity-item-2-title": isVi ? "Quản lý chia sẻ" : "Manage sharing",
    "activity-item-2-text": isVi ? "Xem note nhận từ người khác và những gì bạn đã gửi." : "See notes shared with you and the ones you sent.",
    "activity-item-3-title": isVi ? "Theo dõi bảo mật" : "Track security",
    "activity-item-3-text": isVi ? "Trạng thái mở khóa và dữ liệu được tách rõ." : "Unlock state and protected data stay clearly separated.",
    "quick-hints-title": isVi ? "Gợi ý nhanh" : "Quick tips",
    "quick-hints-text": isVi ? "Luồng bắt đầu nhanh nhất." : "The shortest path to get started.",
    "quick-hint-1": isVi ? "Mở khu nhật ký để tạo ghi chú mới." : "Open the diary area to create a new note.",
    "quick-hint-2": isVi ? "Nhấn mở khóa khi cần xem nội dung gốc." : "Unlock when you need the original content.",
    "quick-hint-3": isVi ? "Dùng khu chia sẻ khi muốn gửi note cho người khác." : "Use the sharing area when you want to send a note.",
    "security-card-title": isVi ? "Bảo mật cá nhân" : "Personal security",
    "security-card-text": isVi ? "Cập nhật hiển thị, khóa cá nhân hoặc mật khẩu khi cần." : "Update your display, journal key, or password when needed.",
    "shared-with-title": isVi ? "Người khác chia sẻ cho tôi" : "Shared with me",
    "shared-with-text": isVi ? "Xem, chỉnh sửa hoặc ẩn những ghi chú được chia sẻ." : "View, edit, or hide notes that were shared with you.",
    "shared-by-title": isVi ? "Tôi đã chia sẻ" : "Shared by me",
    "shared-by-text": isVi ? "Quản lý quyền xem, quyền sửa và link chia sẻ." : "Manage view access, edit access, and share links.",
    "trash-title": isVi ? "Thùng rác 30 ngày" : "30-day trash",
    "trash-text": isVi ? "Nội dung trong thùng rác vẫn được giữ mã hóa." : "Trash content remains encrypted before final cleanup.",
    "profile-display-name-label": isVi ? "Tên hiển thị" : "Display name",
    "profile-username-label": isVi ? "Tên người dùng" : "Username",
    "profile-birth-date-label": isVi ? "Ngày sinh" : "Birth date",
    "profile-email-label": "Email",
    "profile-gender-label": isVi ? "Giới tính" : "Gender",
    "profile-gender-option-empty": isVi ? "Chọn" : "Select",
    "profile-gender-option-male": isVi ? "Nam" : "Male",
    "profile-gender-option-female": isVi ? "Nữ" : "Female",
    "profile-gender-option-other": isVi ? "Khác" : "Other",
    "save-profile": isVi ? "Lưu thông tin" : "Save profile",
    "open-security-panel": isVi ? "Quản lý bảo mật" : "Manage security",
    "dashboard-menu-toggle": isVi ? "Danh mục" : "Sections",
    "calendar-title": isVi ? "Lịch theo tháng" : "Monthly calendar",
    "calendar-text": isVi ? "Xem trọn một tháng và chọn nhanh tháng cần xem." : "See a full month at a glance and jump quickly to another month.",
    "calendar-open-picker": isVi ? "Chọn lịch" : "Pick month",
    "calendar-reminder-text": isVi ? "Nhập nhắc nhở cho ngày bạn chọn." : "Add a reminder for the selected day.",
    "calendar-agenda-title": isVi ? "Nhắc hẹn trong tháng" : "Monthly reminders",
    "calendar-agenda-text": isVi ? "Hiện 5 nhắc hẹn gần đến nhất trong tháng này." : "Showing the 5 nearest reminders in this month.",
    "calendar-weekday-1": isVi ? "T2" : "Mon",
    "calendar-weekday-2": isVi ? "T3" : "Tue",
    "calendar-weekday-3": isVi ? "T4" : "Wed",
    "calendar-weekday-4": isVi ? "T5" : "Thu",
    "calendar-weekday-5": isVi ? "T6" : "Fri",
    "calendar-weekday-6": isVi ? "T7" : "Sat",
    "calendar-weekday-7": isVi ? "CN" : "Sun",
    "shared-align-left": isVi ? "Trái" : "Left",
    "shared-align-center": isVi ? "Giữa" : "Center",
    "shared-align-right": isVi ? "Phải" : "Right",
    "shared-font-size-label": isVi ? "Kích thước" : "Size",
    "shared-font-size-option-empty": isVi ? "Chọn" : "Choose",
    "shared-font-family-label": "Font",
    "shared-font-family-option-empty": isVi ? "Mặc định" : "Default",
    "shared-font-color-label": isVi ? "Màu chữ" : "Text color",
    "shared-highlight-label": isVi ? "Tô nền" : "Highlight",
    "shared-clear-format": isVi ? "Xóa" : "Clear",
    "shared-access-key-label": isVi ? "Khóa kiểm thử" : "Share password",
    "shared-title-label": isVi ? "Tiêu đề" : "Title",
    "shared-content-label": isVi ? "Nội dung" : "Content",
    "shared-note-unlock": isVi ? "Mở ghi chú" : "Open note",
    "shared-note-save": isVi ? "Lưu thay đổi" : "Save changes",
    "font-color-advanced-toggle": isVi ? "Nâng cao" : "Advanced",
    "highlight-color-advanced-toggle": isVi ? "Nâng cao" : "Advanced",
    "share-auth-title": isVi ? "Đăng nhập để tiếp tục" : "Sign in to continue",
    "share-auth-text": isVi ? "Link chia sẻ bằng public key cần đúng tài khoản người nhận trong trình duyệt này để dùng private key tương ứng." : "This public-key share needs the recipient account in this browser so the correct private key can decrypt it.",
    "share-login-identifier-label": isVi ? "Email / Tên người dùng" : "Email / Username",
    "share-login-password-label": isVi ? "Mật khẩu" : "Password",
    "share-login-submit": isVi ? "Đăng nhập và mở" : "Login and open",
  };

  Object.entries(textMap).forEach(([id, value]) => {
    const element = byId(id);
    if (element) element.textContent = value;
  });

  if (els.noteSearch) {
    els.noteSearch.placeholder = isVi ? "Tìm theo tiêu đề..." : "Search by title...";
  }

  if (els.sharedNoteAccessKey) {
    els.sharedNoteAccessKey.placeholder = isVi
      ? "Nhập khóa được người gửi cung cấp."
      : "Enter the key shared by the sender.";
  }

  if (els.shareLoginIdentifier) {
    els.shareLoginIdentifier.placeholder = isVi ? "email@ban.com hoặc ten_dang_nhap" : "you@example.com or username";
  }

  if (els.shareLoginPassword) {
    els.shareLoginPassword.placeholder = isVi ? "Nhập mật khẩu" : "Enter password";
  }

  if (els.calendarNoteInput) {
    els.calendarNoteInput.placeholder = isVi ? "Nhắc mình điều gì vào ngày này?" : "What do you want to remember on this day?";
  }

  if (els.calendarSaveNote) {
    els.calendarSaveNote.textContent = isVi ? "Lưu nhắc nhở" : "Save reminder";
  }

  if (els.calendarClearNote) {
    els.calendarClearNote.textContent = isVi ? "Xóa nhắc nhở" : "Delete reminder";
  }

  if (els.calendarAgendaToggle) {
    els.calendarAgendaToggle.textContent = state.calendarAgendaExpanded
      ? (isVi ? "Rút gọn" : "Show less")
      : (isVi ? "Xem thêm" : "View more");
  }

  document.querySelectorAll("#note-modal .toolbar-select-label span").forEach((label, index) => {
    const values = isVi ? ["Kích thước", "Font"] : ["Size", "Font"];
    if (values[index]) label.textContent = values[index];
  });

  document.querySelectorAll("#note-color-palette > span, #note-highlight-palette > span").forEach((label, index) => {
    const values = isVi ? ["Màu chữ", "Tô nền"] : ["Text color", "Highlight"];
    if (values[index]) label.textContent = values[index];
  });

  document.querySelectorAll("#share-link-panel label").forEach((label, index) => {
    const values = isVi ? ["Quyền chia sẻ", "Tài khoản người nhận", "Link chia sẻ"] : ["Share access", "Recipient account", "Share link"];
    if (values[index]) label.textContent = values[index];
  });

  if (els.shareTopbarLogin) {
    els.shareTopbarLogin.textContent = hasStoredLogin() ? (isVi ? "Bảng điều khiển" : "Dashboard") : t().nav.login;
  }
}

function toggleAuthCard(target) {
  if (!els.loginCard) return;
  els.loginCard.classList.toggle("hidden", target !== "login");
  els.registerCard.classList.toggle("hidden", target !== "register");
  els.otpCard.classList.toggle("hidden", target !== "otp");
  if (els.authTabLogin) els.authTabLogin.classList.toggle("active", target === "login");
  if (els.authTabRegister) els.authTabRegister.classList.toggle("active", target === "register");
  if (els.authTabOtp) {
    els.authTabOtp.classList.toggle("hidden", target !== "otp");
    els.authTabOtp.classList.toggle("active", target === "otp");
  }
  if (target === "otp") renderOtpCardContent();
}

async function api(path, options = {}) {
  startLoading();
  try {
    const response = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) },
      ...options,
    });
    if (response.status === 401 && page === "dashboard" && !path.startsWith("/auth/") && !window.location.hash.replace("#", "").startsWith("share/")) {
      clearSession();
      goToHome();
      throw new Error("Unauthorized");
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      const line = text.trim().split("\n")[0] || "";
      throw new Error(line.startsWith("<") ? t().toasts.apiJsonError : line || t().toasts.apiJsonError);
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  } finally {
    stopLoading();
  }
}

// API Hỗ trợ lấy Public Key của người khác
async function getRecipientPublicKey(identifier) {
  const data = await api(`/user/public-key/${encodeURIComponent(identifier)}`);
  return data.publicKey;
}

function getStoredPrivateKey() {
  return state.user?.uid ? window.NikkiSecurity?.getPrivateKey(state.user.uid) || "" : "";
}

function getMaskedPrivateKey(privateKey = "") {
  if (!privateKey) return "";
  const lines = privateKey.split("\n");
  return lines.map((line, index) => {
    if (index === 0 || index === lines.length - 1) return line;
    return line ? "•".repeat(Math.max(16, line.length)) : "";
  }).join("\n");
}

function updateSecurityKeyUI() {
  if (!els.securityPublicKey || !els.securityPrivateKey || !els.rsaKeyStatus) return;
  const publicKey = state.user?.publicKey || "";
  const privateKey = getStoredPrivateKey();
  const hasKeyPair = Boolean(publicKey && privateKey);

  els.rsaKeyStatus.textContent = hasKeyPair ? "Key pair ready" : "No key pair";
  els.securityPublicKey.value = publicKey;
  els.securityPrivateKey.value = state.rsaPrivateKeyVisible ? privateKey : getMaskedPrivateKey(privateKey);
  els.securityPrivateKey.classList.toggle("is-visible", state.rsaPrivateKeyVisible);
  if (els.showPrivateKey) {
    els.showPrivateKey.textContent = state.rsaPrivateKeyVisible ? "Hide Private Key" : "Show Private Key";
  }
}

async function ensureUserKeyPair(forceRegenerate = false) {
  if (!state.user?.uid || !window.NikkiSecurity) return null;
  const result = await window.NikkiSecurity.ensureKeyPairForUser(
    state.user,
    async (publicKey) => {
      await api("/user/public-key", {
        method: "PUT",
        body: JSON.stringify({ publicKey }),
      });
      state.user = { ...state.user, publicKey };
      localStorage.setItem("diaryUser", JSON.stringify(state.user));
    },
    forceRegenerate
  );
  updateSecurityKeyUI();
  return result;
}

async function decryptDiaryPayload(encryptedContent) {
  const privateKey = getStoredPrivateKey();
  const encryptionType = window.NikkiSecurity?.detectEncryptionType(encryptedContent) || "";
  if (!privateKey || !encryptedContent || !window.NikkiSecurity || encryptionType !== "public-key") return "";

  try {
    return await window.NikkiSecurity.decryptContentWithPrivateKey(encryptedContent, privateKey);
  } catch {
    return "";
  }
}

function detectShareEncryptionType(payload, explicitType = "") {
  return explicitType || window.NikkiSecurity?.detectEncryptionType(payload) || "";
}

function canReadSharedContent() {
  return state.notesUnlocked;
}

async function decryptSharedPayload(sharedPayload, password = "") {
  console.log("decryptSharedPayload called, encryptionType:", detectShareEncryptionType(sharedPayload?.encryptedContent, sharedPayload?.encryptionType));
  const encryptionType = detectShareEncryptionType(sharedPayload?.encryptedContent, sharedPayload?.encryptionType);
  
  // Symmetric only needs password, no personal key required
  // Public-key needs personal key (canReadSharedContent must be true)
  if (encryptionType === "public-key" && !canReadSharedContent()) return "";
  if (!sharedPayload?.encryptedContent || !encryptionType || !window.NikkiSecurity) return "";

  try {
    if (encryptionType === "public-key") {
      const privateKey = getStoredPrivateKey();
      if (!privateKey) return "";
      return await window.NikkiSecurity.decryptContentWithPrivateKey(sharedPayload.encryptedContent, privateKey);
    }

    if (encryptionType === "symmetric") {
      console.log("Attempting symmetric decryption with password provided:", !!password);
      if (!password) return "";
      return await window.NikkiSecurity.decryptContentWithPassword(sharedPayload.encryptedContent, password);
    }

    return "";
  } catch (error) {
    console.log("Decryption failed:", error.message);
    return "";
  }
}

function updateShareModalFields() {
  const encryptionType = els.shareEncryptionType?.value || "symmetric";
  if (els.shareSymmetricField) els.shareSymmetricField.classList.toggle("hidden", encryptionType !== "symmetric");
  if (els.sharePublicKeyField) els.sharePublicKeyField.classList.toggle("hidden", encryptionType !== "public-key");
}

function updateSharedViewForEncryption(sharedPayload) {
  const encryptionType = detectShareEncryptionType(sharedPayload?.encryptedContent, sharedPayload?.encryptionType);
  const isSymmetric = encryptionType === "symmetric";
  const isPublicKey = encryptionType === "public-key";
  const isVi = state.language === "vi";

  if (els.sharedNoteAccessKey) {
    els.sharedNoteAccessKey.classList.toggle("hidden", !isSymmetric);
    els.sharedNoteAccessKey.placeholder = isSymmetric
      ? (isVi ? "Nhập khóa được người gửi cung cấp." : "Enter the password shared by the sender.")
      : (isVi ? "Sẽ dùng private key trong trình duyệt này." : "The private key stored in this browser will be used.");
  }
  if (els.sharedNoteKey) {
    els.sharedNoteKey.textContent = isSymmetric
      ? (isVi ? "Ghi chú này dùng chia sẻ bằng mật khẩu." : "This note uses password-based sharing.")
      : (isVi ? "Ghi chú này dùng public-key và sẽ giải mã bằng private key của người nhận." : "This note uses public-key sharing and decrypts with the recipient's private key.");
  }
  updateShareAuthGate(sharedPayload);
  const isPublicKey = detectShareEncryptionType(sharedPayload?.encryptedContent, sharedPayload?.encryptionType) === "public-key";
  if (els.sharedNoteKey && isPublicKey && !canReadSharedContent()) {
    els.sharedNoteKey.textContent = isVi
      ? "Hãy mở khóa nhật ký trước, nếu chưa nội dung sẽ chỉ hiển thị dạng mã hóa."
      : "Unlock the diary first. Until then, the shared content stays encrypted.";
  }
}

function updateShareAuthGate(sharedPayload = state.sharedPayload) {
  if (!els.shareAuthGate) return;
  const encryptionType = detectShareEncryptionType(sharedPayload?.encryptedContent, sharedPayload?.encryptionType);
  const needsLogin = encryptionType === "public-key" && (!hasActiveSession() || !hasStoredPrivateKeyForCurrentUser());
  els.shareAuthGate.classList.toggle("hidden", !needsLogin);
}

async function hydrateNote(note, overrideKey = "") {
  if (!note) return note;
  note.decryptedContent = "";

  if (!note.decryptedContent && note.encryptedContent) {
    note.decryptedContent = getNoteContent(note, overrideKey);
  }

  return note;
}

async function hydrateAllVisibleNotes(overrideKey = "") {
  await Promise.all([
    ...state.notes.map((note) => hydrateNote(note, overrideKey)),
    ...state.trash.map((note) => hydrateNote(note, overrideKey)),
  ]);
}

function getResolvedNoteTitle(note) {
  return note?.title || getNoteTitle(note) || t().toasts.encryptedTitle;
}

function getResolvedNoteContent(note) {
  return note?.decryptedContent || getNoteContent(note) || "";
}

function setSession(data, password) {
  state.token = data.token;
  state.user = data.user;
  state.tempPassword = password;
  state.currentScreen = localStorage.getItem("diaryCurrentScreen") || "dashboard-home";
  state.notesUnlocked = false;
  state.personalKey = "";
  state.hasAuthenticatedInSession = true;
  localStorage.setItem("diaryToken", data.token);
  localStorage.setItem("diaryUser", JSON.stringify(data.user));
  sessionStorage.setItem("tempPassword", password);
  sessionStorage.setItem("diaryAuthenticatedThisSession", "true");
  sessionStorage.removeItem("personalKey");
  updateStaticDashboardCopy();
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
  state.shareToken = "";
  state.personalKeyRequestId = "";
  state.profileAccessRequestId = "";
  state.passwordRequestId = "";
  state.accountDeletionRequestId = "";
  state.profileAccessUnlocked = false;
  state.sharedPayload = null;
  state.hasAuthenticatedInSession = false;
  state.currentScreen = "dashboard-home";
  localStorage.removeItem("diaryToken");
  localStorage.removeItem("diaryUser");
  sessionStorage.removeItem("tempPassword");
  sessionStorage.removeItem("personalKey");
  sessionStorage.removeItem("recoveryRequestId");
  sessionStorage.removeItem("diaryAuthenticatedThisSession");
  updateStaticDashboardCopy();
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
  if (els.noteSearch) {
    els.noteSearch.disabled = !state.notesUnlocked;
    els.noteSearch.placeholder = state.notesUnlocked
      ? t().toasts.searchPlaceholder
      : state.language === "vi"
        ? "Mở khóa để tìm kiếm..."
        : "Unlock to search...";
  }
  if (els.shareStatus) els.shareStatus.textContent = t().toasts.shareInfo;
  if (els.noteEditor) els.noteEditor.classList.toggle("is-locked", !state.notesUnlocked);
  if (els.saveNote) els.saveNote.disabled = !state.notesUnlocked;
  if (els.shareNote) els.shareNote.disabled = !state.notesUnlocked;
  if (els.fab) els.fab.disabled = !state.notesUnlocked;
}

function ensureNotesUnlockedForAction() {
  if (state.notesUnlocked) return true;
  showToast(t().toasts.needUnlock);
  return false;
}

function renderNotes() {
  if (!els.notesList || !els.trashList || !els.noteSearch) return;
  const copy = t().dashboard;
  const query = els.noteSearch.value.trim().toLowerCase();
  const lockedActionAttrs = state.notesUnlocked ? "" : ' disabled aria-disabled="true"';
  const visibleNotes = state.notes.filter((note) => {
    const title = state.notesUnlocked && getResolvedNoteContent(note) ? getResolvedNoteTitle(note) : t().toasts.encryptedTitle;
    return !query || title.toLowerCase().includes(query);
  });
  if (!visibleNotes.length) {
    els.notesList.innerHTML = `<article class="note-card"><p>${escapeHtml(copy.emptyNotes)}</p></article>`;
  } else {
    els.notesList.innerHTML = visibleNotes.map((note) => {
      const isReadable = state.notesUnlocked && Boolean(getResolvedNoteContent(note));
      const title = isReadable ? getResolvedNoteTitle(note) : t().toasts.encryptedTitle;
      const preview = isReadable ? getResolvedNoteContent(note) : note.encryptedContent;
      return `<article class="note-card note-card-clickable" onclick="selectNote('${note.id}')"><span class="note-meta">${isReadable ? copy.unlockedBadge : copy.lockedBadge}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml((preview || note.encryptedContent || "").slice(0, 140))}</p><div class="row"><button class="secondary-btn" type="button" onclick="event.stopPropagation(); selectNote('${note.id}')"${lockedActionAttrs}>${copy.openLabel}</button><button class="secondary-btn" type="button" onclick="event.stopPropagation(); deleteNote('${note.id}')"${lockedActionAttrs}>${copy.deleteLabel}</button></div></article>`;
    }).join("");
  }
  if (!state.trash.length) {
    els.trashList.innerHTML = `<article class="note-card"><p>${escapeHtml(copy.emptyTrash)}</p></article>`;
    return;
  }
  els.trashList.innerHTML = state.trash.map((note) => {
    const isReadable = state.notesUnlocked && Boolean(getResolvedNoteContent(note));
    const title = isReadable ? getResolvedNoteTitle(note) : t().toasts.encryptedTitle;
    const preview = isReadable ? getResolvedNoteContent(note) : note.encryptedContent || "";
    return `<article class="note-card"><span class="note-meta">${escapeHtml(isReadable ? copy.unlockedBadge : copy.lockedBadge)}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(preview.slice(0, 140))}</p><div class="row"><button class="secondary-btn" type="button" onclick="restoreNote('${note.id}')"${lockedActionAttrs}>${copy.restoreLabel}</button><button class="secondary-btn" type="button" onclick="permanentlyDeleteNote('${note.id}')"${lockedActionAttrs}>${copy.permanentDeleteLabel}</button></div></article>`;
  }).join("");
}

function setEditorMode() {
  if (!els.noteEditor || !els.noteTitle) return;
  const locked = !state.notesUnlocked;
  els.noteEditor.contentEditable = String(!locked);
  els.noteEditor.classList.toggle("is-locked", locked);
  els.noteTitle.readOnly = locked;
}

function switchScreen(screenId) {
  if (!els.screens.length) return;
  if (screenId !== "share-view") {
    state.previousScreen = screenId;
    persistCurrentScreen(screenId);
  }
  state.currentScreen = screenId;
  const dashboardRoot = document.querySelector(".dashboard");
  const isShareScreen = screenId === "share-view";
  const isSharedDialog = isShareScreen && state.sharedViewOrigin === "dashboard";
  els.screens.forEach((screen) => screen.classList.toggle("hidden", screen.id !== screenId));
  els.sideButtons.forEach((button) => button.classList.toggle("active", button.dataset.screen === screenId));
  if (els.fab) els.fab.classList.toggle("hidden", isShareScreen);
  if (dashboardRoot) dashboardRoot.classList.toggle("share-mode", isShareScreen && !isSharedDialog);
  if (dashboardRoot) dashboardRoot.classList.toggle("share-dialog-mode", isSharedDialog);
  if (els.publicShareTopbar) els.publicShareTopbar.classList.toggle("hidden", !isShareScreen || isSharedDialog);
  if (els.sharedViewClose) els.sharedViewClose.classList.toggle("hidden", !isSharedDialog);
  const customScreens = {
    calendar: state.language === "vi"
      ? ["Lịch", "Đánh dấu những ngày quan trọng bằng ghi chú ngắn."]
      : ["Calendar", "Mark important days with short reminders."],
  };
  const [title, subtitle] = customScreens[screenId] || t().dashboard.screens[screenId] || ["Dashboard", ""];
  if (els.screenTitle) els.screenTitle.textContent = title;
  if (els.screenSubtitle) els.screenSubtitle.textContent = subtitle;
  els.topScreenButtons.forEach((button) => button.classList.toggle("active", button.dataset.screen === screenId));
  updateUnlockStateUI();
  setEditorMode();
}

async function refreshNotes() {
  if (!state.token) return;
  state.notes = await api("/notes");
  state.trash = await api("/notes?includeTrash=true");
  await hydrateAllVisibleNotes();
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

  const isVi = state.language === "vi";

  // 1. DANH SÁCH NGƯỜI KHÁC CHIA SẺ CHO MÌNH
  if (!state.sharedWithMe.length) {
    els.sharedWithMeList.innerHTML = `<article class="note-card"><p>${escapeHtml(isVi ? "Chưa có nhật ký nào được chia sẻ cho bạn." : "No notes have been shared with you yet.")}</p></article>`;
  } else {
    els.sharedWithMeList.innerHTML = state.sharedWithMe.map((share) => `
      <article class="note-card">
        <span class="note-meta">${escapeHtml(share.canEdit ? (isVi ? "Có quyền sửa" : "Can edit") : (isVi ? "Chỉ xem" : "View only"))}</span>
        <h4>${escapeHtml(share.ownerName || (isVi ? "Chủ sở hữu" : "Owner"))}</h4>
        <p>${escapeHtml(share.canView ? (isVi ? "Mở note này để xem chi tiết (Hỗ trợ giải mã tự động)." : "Open this note to view details (Auto-decryption supported).") : (isVi ? "Chủ sở hữu đang tạm tắt quyền xem." : "Owner has temporarily disabled view access."))}</p>
        <div class="row">
          <button class="secondary-btn" type="button" onclick="openSharedDashboardNote('${share.id}')">${isVi ? "Mở" : "Open"}</button>
          <button class="secondary-btn" type="button" onclick="removeSharedDashboardNote('${share.id}')">${isVi ? "Ẩn" : "Hide"}</button>
        </div>
      </article>
    `).join("");
  }

  // 2. DANH SÁCH MÌNH CHIA SẺ CHO NGƯỜI KHÁC
  if (!state.sharedByMe.length) {
    els.sharedByMeList.innerHTML = `<article class="note-card"><p>${escapeHtml(isVi ? "Bạn chưa chia sẻ nhật ký nào." : "You have not shared any notes yet.")}</p></article>`;
  } else {
    els.sharedByMeList.innerHTML = state.sharedByMe.map((share) => `
      <article class="note-card">
        <span class="note-meta">${escapeHtml(share.accessMode === "edit" ? (isVi ? "Quyền sửa" : "Edit access") : (isVi ? "Link công khai" : "Public view"))}</span>
        <h4>${escapeHtml(share.recipientName || (isVi ? "Link công khai" : "Public link"))}</h4>
        <p>${escapeHtml(isVi ? `Xem: ${share.canView ? "Bật" : "Tắt"} | Sửa: ${share.canEdit ? "Bật" : "Tắt"}` : `View: ${share.canView ? "On" : "Off"} | Edit: ${share.canEdit ? "On" : "Off"}`)}</p>
        <div class="row">
          <button class="secondary-btn" type="button" onclick="openSharedDashboardNote('${share.id}')">${isVi ? "Mở" : "Open"}</button>
          <button class="secondary-btn" type="button" onclick="toggleShareViewAccess('${share.id}', ${share.canView ? "false" : "true"})">${share.canView ? (isVi ? "Tắt xem" : "Disable view") : (isVi ? "Bật xem" : "Enable view")}</button>
          ${share.accessMode === "edit" ? `<button class="secondary-btn" type="button" onclick="toggleShareEditAccess('${share.id}', ${share.canEdit ? "false" : "true"})">${share.canEdit ? (isVi ? "Khóa sửa" : "Lock edit") : (isVi ? "Cho sửa" : "Allow edit")}</button>` : ""}
          <button class="secondary-btn" type="button" onclick="stopOwnedShare('${share.id}')">${isVi ? "Ngừng chia sẻ" : "Stop sharing"}</button>
        </div>
      </article>
    `).join("");
  }
}

window.selectNote = function selectNote(noteId) {
  if (!ensureNotesUnlockedForAction()) return;
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;
  if (!getResolvedNoteContent(note)) return showToast(t().toasts.invalidKey);
  state.selectedNoteId = noteId;
  els.noteTitle.value = getResolvedNoteTitle(note);
  els.noteEditor.innerHTML = getResolvedNoteContent(note);
  if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
  setEditorMode();
  openNoteModal();
};

window.deleteNote = async function deleteNote(noteId) {
  if (!ensureNotesUnlockedForAction()) return;
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
  if (!ensureNotesUnlockedForAction()) return;
  try { await api(`/notes/${noteId}/restore`, { method: "POST" }); showToast(t().toasts.restored); await refreshNotes(); } catch (error) { showToast(error.message); }
};

window.permanentlyDeleteNote = async function permanentlyDeleteNote(noteId) {
  if (!ensureNotesUnlockedForAction()) return;
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
  if (!ensureNotesUnlockedForAction()) return;
  const title = els.noteTitle.value.trim();
  const content = els.noteEditor.innerHTML.trim();
  const encryptionKey = getEncryptionKey();
  if (!title || !content) return showToast(t().toasts.needFields);
  if (!encryptionKey) return showToast(t().toasts.needKey);
  try {
    const encryptedContent = encryptText(content, encryptionKey);
    await api(state.selectedNoteId ? `/notes/${state.selectedNoteId}` : "/notes", {
      method: state.selectedNoteId ? "PUT" : "POST",
      body: JSON.stringify({ title, encryptedContent }),
    });
    showToast(t().toasts.saved);
    resetNoteEditorForNewEntry();
    closeNoteModal();
    await refreshNotes();
  } catch (error) { showToast(error.message); }
}

function formatEditor(command, value = null, target = null) {
  const editor = target || els.noteEditor;
  if (!editor) return;
  editor.focus();
  document.execCommand("styleWithCSS", false, true);
  document.execCommand(command, false, value);
}

function bindColorPalette(containerSelector, command, advancedToggleId, inputId, target = null) {
  const container = document.querySelector(containerSelector);
  const advancedToggle = byId(advancedToggleId);
  const input = byId(inputId);
  if (!container || !input) return;

  container.querySelectorAll("[data-color]").forEach((button) => on(button, "click", () => {
    if (!target && !ensureNotesUnlockedForAction()) return;
    formatEditor(command, button.dataset.color, target);
  }));

  on(advancedToggle, "click", () => input.click());
  on(input, "input", () => {
    if (!target && !ensureNotesUnlockedForAction()) return;
    if (!input.value) return;
    formatEditor(command, input.value, target);
  });
}

function downloadCurrentNoteAsWord() {
  const title = els.noteTitle.value.trim() || "Diary entry";
  const content = els.noteEditor.innerHTML || "";
  const safeTitle = title.replace(/[^a-zA-Z0-9\-_ ]/g, "").trim() || "diary-entry";
  const wordHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body>${content}</body></html>`;
  const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeTitle}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initCalendarControls() {
  syncCalendarSelectors();
  on(els.calendarOpenPicker, "click", () => {
    syncCalendarSelectors();
    openModal(els.calendarControlsModal);
  });
  on(els.calendarMonthInline, "change", () => {
    const month = Number(els.calendarMonthInline?.value || 0);
    const year = Number(els.calendarYearInline?.value || new Date(state.calendarViewDate).getFullYear());
    state.calendarViewDate = new Date(year, month, 1);
    renderCalendarWidget();
  });
  on(els.calendarYearInline, "change", () => {
    const month = Number(els.calendarMonthInline?.value || new Date(state.calendarViewDate).getMonth());
    const year = Number(els.calendarYearInline?.value || new Date().getFullYear());
    state.calendarViewDate = new Date(year, month, 1);
    renderCalendarWidget();
  });
  on(els.calendarPrev, "click", () => {
    const viewDate = new Date(state.calendarViewDate);
    state.calendarViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendarWidget();
  });

  on(els.calendarNext, "click", () => {
    const viewDate = new Date(state.calendarViewDate);
    state.calendarViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendarWidget();
  });

  on(els.calendarSaveNote, "click", () => {
    if (!state.notesUnlocked || !els.calendarNoteInput) return showToast(t().toasts.needUnlock);
    state.calendarNotes[state.selectedCalendarDate] = els.calendarNoteInput.value.trim();
    saveCalendarNotes();
    renderCalendarWidget();
    showToast(state.language === "vi" ? "Đã lưu nhắc nhở." : "Reminder saved.");
  });

  on(els.calendarClearNote, "click", () => {
    if (!state.notesUnlocked) return showToast(t().toasts.needUnlock);
    delete state.calendarNotes[state.selectedCalendarDate];
    saveCalendarNotes();
    renderCalendarWidget();
    showToast(state.language === "vi" ? "Đã xóa nhắc nhở." : "Reminder deleted.");
  });

  on(els.calendarAgendaToggle, "click", () => {
    state.calendarAgendaExpanded = !state.calendarAgendaExpanded;
    renderCalendarAgenda();
  });

  on(els.calendarControlsApply, "click", () => {
    const month = Number(els.calendarMonthSelect?.value || 0);
    const year = Number(els.calendarYearSelect?.value || new Date().getFullYear());
    state.calendarViewDate = new Date(year, month, 1);
    closeModal(els.calendarControlsModal);
    renderCalendarWidget();
  });

  on(els.calendarControlsClose, "click", () => closeModal(els.calendarControlsModal));
}

// BẬT MODAL CHIA SẺ
async function shareSelectedNote() {
  if (!state.selectedNoteId) return showToast(t().toasts.noNoteToShare);
  if (!state.notesUnlocked) return showToast(t().toasts.needUnlock);

  if (els.shareEncryptionType) els.shareEncryptionType.value = "symmetric";
  if (els.shareTestKey) els.shareTestKey.value = "";
  if (els.shareRecipientInput) els.shareRecipientInput.value = "";
  updateShareModalFields();
  if (els.shareRecipient) els.shareRecipient.value = "";

  openModal(els.shareKeyModal);
}

async function confirmShareSelectedNote() {
  const encryptionType = els.shareEncryptionType?.value || "symmetric";
  const recipientIdentifier = els.shareRecipientInput?.value.trim() || "";
  const sharePassword = els.shareTestKey?.value.trim() || "";
  const accessMode = els.shareAccessMode?.value || "view";

  try {
    const note = state.notes.find((item) => item.id === state.selectedNoteId);
    if (!note) return showToast(t().toasts.noNoteToShare);

    const originalTitle = getResolvedNoteTitle(note);
    const originalContent = getResolvedNoteContent(note);
    let encryptedContent = "";

    if (encryptionType === "symmetric") {
      if (!sharePassword) return showToast("Please enter a password for symmetric sharing.");
      encryptedContent = await window.NikkiSecurity.encryptContentWithPassword(originalContent, sharePassword);
    } else {
      if (!recipientIdentifier) return showToast(t().toasts.needRecipient);
      const publicKey = await getRecipientPublicKey(recipientIdentifier);
      encryptedContent = await window.NikkiSecurity.encryptContentWithPublicKey(originalContent, publicKey);
    }

    const data = await api(`/notes/${state.selectedNoteId}/share`, {
      method: "POST",
      body: JSON.stringify({
        title: originalTitle,
        encryptedContent,
        encryptionType,
        accessMode,
        recipientIdentifier: encryptionType === "public-key" ? recipientIdentifier : "",
      }),
    });

    if (els.shareLinkOutput) els.shareLinkOutput.value = data.shareLink;
    if (els.shareLinkPanel) els.shareLinkPanel.classList.remove("hidden");
    closeModal(els.shareKeyModal);
    await navigator.clipboard.writeText(data.shareLink);
    showToast(t().toasts.shareCreated);
    await refreshSharedNotes();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadProfile() {
  if (!state.token) return;
  const user = await api("/user/me");
  state.user = user;
  localStorage.setItem("diaryUser", JSON.stringify(user));
  loadCalendarNotes();
  renderCalendarWidget();
  els.profileDisplayName.value = user.displayName || "";
  els.profileUsername.value = user.username || "";
  els.profileBirthDate.value = user.birthDate || "";
  els.profileEmail.value = user.email || "";
  els.profileGender.value = user.gender || "";
  if (els.userDropdownTrigger) els.userDropdownTrigger.textContent = user.displayName || user.username || "User";
  await ensureUserKeyPair();
  updateSecurityKeyUI();
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
  if (!state.notesUnlocked) {
    setEditorMode();
    return;
  }
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
function openNoteModal() { openModal(els.noteModal); }
function closeNoteModal() {
  if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
  closeModal(els.noteModal);
}
function prepareNewNoteModal() {
  if (!state.notesUnlocked) {
    setEditorMode();
    return;
  }
  state.selectedNoteId = null;
  if (els.noteTitle) els.noteTitle.value = "";
  if (els.noteEditor) els.noteEditor.innerHTML = "";
  if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
  setEditorMode();
  openNoteModal();
}
function openSecurityStepModal(element) {
  closeModal(els.securityModal);
  openModal(element);
}

function openUnlockNotesModal() {
  const promptMessage = state.language === "vi"
    ? "Nhập khóa nhật ký để mở khóa:"
    : "Enter your personal key to unlock the diary:";
  const defaultKey = state.personalKey || (isPersonalKeyLinkedToPassword() ? state.tempPassword : "");
  const key = window.prompt(promptMessage, defaultKey);
  if (key === null) return;
  confirmUnlockNotes(key.trim());
}

function confirmUnlockNotes(key = "") {
  key = String(key || els.notesToolbarKey?.value || "").trim();
  if (!key) return showToast(t().toasts.needKey);
  if (!hasValidPersonalKey(key)) return showToast(t().toasts.invalidKey);

  hydrateAllVisibleNotes(key)
    .then(() => {
      const hasReadableNotes = !state.notes.length && !state.trash.length
        ? true
        : [...state.notes, ...state.trash].some((note) => Boolean(getResolvedNoteContent(note)));
      if (!hasReadableNotes) {
        return showToast(t().toasts.invalidKey);
      }
      state.personalKey = key;
      if (els.notesToolbarKey) els.notesToolbarKey.value = key;
      sessionStorage.setItem("personalKey", key);
      state.notesUnlocked = true;
      renderDashboardStats();
      updateUnlockStateUI();
      renderNotes();
      if (state.selectedNoteId) {
        const selectedNote = state.notes.find((note) => note.id === state.selectedNoteId);
        if (!selectedNote || !getResolvedNoteContent(selectedNote)) {
          resetNoteEditorForNewEntry();
        } else {
          els.noteTitle.value = getResolvedNoteTitle(selectedNote);
          els.noteEditor.innerHTML = getResolvedNoteContent(selectedNote);
          if (els.shareLinkPanel) els.shareLinkPanel.classList.add("hidden");
          setEditorMode();
        }
      }
      showToast(t().toasts.unlockSuccess);
    })
    .catch((error) => showToast(error.message || t().toasts.invalidKey));
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

async function loadSharedNoteForSession(shareId) {
  if (!hasActiveSession() || !shareId) return null;
  try {
    return await api(`/notes/shares/${shareId}`);
  } catch {
    return null;
  }
}

async function hydrateSharedPayloadFromSession(sharedPayload) {
  const resolved = await loadSharedNoteForSession(sharedPayload?.id || state.selectedSharedNoteId);
  return resolved || sharedPayload;
}

async function loadSharedNote() {
  const hash = window.location.hash.replace("#", "");
  if (!hash.startsWith("share/")) return false;
  const shareToken = hash.split("/")[1];
  state.shareToken = shareToken;
  state.sharedViewOrigin = "public";
  try {
    const publicPayload = await api(`/notes/shared/${shareToken}`);
    const data = await hydrateSharedPayloadFromSession(publicPayload);
    state.sharedPayload = data;
    state.selectedSharedNoteId = data.id || "";
    switchScreen("share-view");
    els.sharedNoteTitle.textContent = data.title || t().toasts.encryptedTitle;
    updateSharedViewForEncryption(data);
    if (els.sharedNoteTitleInput) {
      els.sharedNoteTitleInput.value = data.title || "";
      els.sharedNoteTitleInput.readOnly = true;
    }
    if (els.sharedNoteEditor) {
      els.sharedNoteEditor.innerHTML = data.encryptedContent || "";
      els.sharedNoteEditor.contentEditable = false;
    }
    if (els.sharedToolbar) els.sharedToolbar.classList.add("hidden");
    if (els.sharedNoteSave) els.sharedNoteSave.classList.add("hidden");
    if (canReadSharedContent() && detectShareEncryptionType(data.encryptedContent, data.encryptionType) === "public-key" && hasActiveSession() && hasStoredPrivateKeyForCurrentUser()) {
      const content = await decryptSharedPayload(data);
      if (content && els.sharedNoteEditor) {
        els.sharedNoteEditor.innerHTML = content;
        const canEdit = Boolean(data.canEdit && (data.isOwner || data.isRecipient));
        els.sharedNoteEditor.contentEditable = canEdit;
        if (els.sharedNoteTitleInput) els.sharedNoteTitleInput.readOnly = !canEdit;
        if (els.sharedToolbar) els.sharedToolbar.classList.toggle("hidden", !canEdit);
        if (els.sharedNoteSave) els.sharedNoteSave.classList.toggle("hidden", !canEdit);
        if (els.sharedNoteUnlock) els.sharedNoteUnlock.classList.add("hidden");
      }
    }
  } catch (error) {
    showToast(error.message || t().toasts.sharedLoadError);
  }
  return true;
}

window.openSharedDashboardNote = async function openSharedDashboardNote(shareId) {
  try {
    const data = await api(`/notes/shares/${shareId}`);
    state.sharedPayload = data;
    state.selectedSharedNoteId = shareId;
    state.sharedViewOrigin = "dashboard";
    switchScreen("share-view");

    els.sharedNoteTitle.textContent = data.title || t().dashboard.screens["share-view"][0];
    updateSharedViewForEncryption(data);
    if (els.sharedNoteUnlock) els.sharedNoteUnlock.classList.remove("hidden");

    if (els.sharedNoteTitleInput) {
      els.sharedNoteTitleInput.value = data.title || "";
      els.sharedNoteTitleInput.readOnly = !data.canEdit;
    }
    if (els.sharedNoteEditor) {
      els.sharedNoteEditor.innerHTML = data.encryptedContent || "";
      els.sharedNoteEditor.contentEditable = false;
    }
    if (els.sharedToolbar) els.sharedToolbar.classList.add("hidden");
    if (els.sharedNoteSave) els.sharedNoteSave.classList.add("hidden");

    if (canReadSharedContent() && detectShareEncryptionType(data.encryptedContent, data.encryptionType) === "public-key") {
      const content = await decryptSharedPayload(data);
      if (content && els.sharedNoteEditor) {
        els.sharedNoteEditor.innerHTML = content;
        const canEdit = Boolean(data.canEdit && (data.isOwner || data.isRecipient));
        els.sharedNoteEditor.contentEditable = canEdit;
        if (els.sharedNoteTitleInput) els.sharedNoteTitleInput.readOnly = !canEdit;
        if (els.sharedToolbar) els.sharedToolbar.classList.toggle("hidden", !canEdit);
        if (els.sharedNoteSave) els.sharedNoteSave.classList.toggle("hidden", !canEdit);
        if (els.sharedNoteUnlock) els.sharedNoteUnlock.classList.add("hidden");
      }
    }
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
    if (page === "dashboard" && els.shareTopbarLogin) els.shareTopbarLogin.textContent = t().nav.login;
    renderNotes();
    renderSharedLists();   // <-- Ép dịch ngay danh sách chia sẻ
    renderCalendarWidget(); // <-- Ép dịch luôn cả Lịch
  });
}

function initHomePage() {
  renderMarketingContent();
  initHomeShowcase();
  els.navButtons.forEach((button) => on(button, "click", () => {
    const target = byId(button.dataset.section);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  on(els.brandHome, "click", () => goToHome("home"));
  on(els.navLogin, "click", () => goToLogin());
  on(els.heroAbout, "click", () => byId("about")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  on(els.heroLogin, "click", () => {
    goToLogin();
  });
  const section = byId(window.location.hash.replace("#", ""));
  if (section) requestAnimationFrame(() => section.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function initLoginPage() {
  renderMarketingContent();
  if (state.token && state.user && state.hasAuthenticatedInSession) return goToDashboard();
  toggleAuthCard(state.pendingId || state.forgotPasswordRequestId ? "otp" : "login");
  on(els.brandHome, "click", () => goToHome("home"));
  on(els.navLogin, "click", () => (hasStoredLogin() ? goToDashboard() : goToLogin()));
  els.navButtons.forEach((button) => on(button, "click", () => goToHome(button.dataset.section)));
  on(els.authTabLogin, "click", () => { state.authFlow = "register"; sessionStorage.setItem("authFlow", "register"); toggleAuthCard("login"); });
  on(els.authTabRegister, "click", () => { state.authFlow = "register"; sessionStorage.setItem("authFlow", "register"); toggleAuthCard("register"); });
  on(els.authBackHome, "click", () => goToHome("home"));
  on(els.goRegister, "click", () => { state.authFlow = "register"; sessionStorage.setItem("authFlow", "register"); toggleAuthCard("register"); });
  on(els.goLogin, "click", () => { state.authFlow = "register"; sessionStorage.setItem("authFlow", "register"); toggleAuthCard("login"); });
  on(els.loginIdentifier, "input", () => validateLoginIdentifierField());
  on(els.registerUsername, "input", () => validateRegisterUsernameField());
  on(els.togglePassword, "click", () => {
    const currentType = els.loginPassword.getAttribute("type");
    const copy = t().auth;
    els.loginPassword.setAttribute("type", currentType === "password" ? "text" : "password");
    els.togglePassword.textContent = currentType === "password" ? copy.toggleHide : copy.toggleShow;
  });
  
  on(els.loginSubmit, "click", async () => {
    try {
      const identifier = els.loginIdentifier.value.trim();
      if (!validateLoginIdentifierField()) return;
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password: els.loginPassword.value }) });
      setSession(data, els.loginPassword.value);
      showToast(t().toasts.loginSuccess);
      await ensureUserKeyPair();
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
      const username = els.registerUsername.value.trim();
      if (!validateRegisterUsernameField()) return;
      if (!isValidUsername(username)) {
        return showToast(state.language === "vi"
          ? "Tên người dùng chỉ được dùng chữ thường không dấu, số hoặc dấu gạch dưới, dài 4-32 ký tự."
          : "Username must use 4-32 lowercase letters, numbers, or underscores only.");
      }
      els.registerUsername.value = username;
      await window.NikkiSecurity?.createPendingRegistrationKeyPair(els.registerEmail.value.trim());
      const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ username, email: els.registerEmail.value.trim(), password: els.registerPassword.value }) });
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
  if (els.shareTopbarLogin) els.shareTopbarLogin.textContent = t().nav.login;
  if (els.notesToolbarKey && state.personalKey) els.notesToolbarKey.value = state.personalKey;
  loadCalendarNotes();
  renderCalendarWidget();
  initCalendarControls();
// --- CHỨC NĂNG SÁNG / TỐI (THEME) ---
  const themeToggle = byId("theme-toggle");
  if (themeToggle) {
    const sunIcon = document.querySelector(".sun-icon");
    const moonIcon = document.querySelector(".moon-icon");

    // Khôi phục trạng thái Sáng/Tối nếu người dùng đã lưu từ trước
    const currentTheme = localStorage.getItem("diaryTheme") || "light";
    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
      if (sunIcon) sunIcon.classList.add("hidden");
      if (moonIcon) moonIcon.classList.remove("hidden");
    }

    // Xử lý khi bấm nút Đổi Theme
    on(themeToggle, "click", () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      
      // Lưu trạng thái vào máy
      localStorage.setItem("diaryTheme", isDark ? "dark" : "light");
      
      // Đổi icon Mặt trời / Mặt trăng
      if (sunIcon) sunIcon.classList.toggle("hidden", isDark);
      if (moonIcon) moonIcon.classList.toggle("hidden", !isDark);
    });
  }
  // NÚT BẤM CỦA KHUNG VIÊN THUỐC MENU / HOME
  on(byId("dashboard-menu-toggle"), "click", () => {
    const dashboard = document.querySelector(".dashboard");
    if (dashboard) {
      dashboard.classList.toggle("sidebar-closed");
    }
  });
  on(els.shareBrandHome, "click", () => goToHome("home"));
  els.navButtons.forEach((button) => on(button, "click", () => goToHome(button.dataset.section)));
  on(els.shareTopbarLogin, "click", () => {
    if (hasStoredLogin()) return goToDashboard();
    goToLogin();
  });

  document.querySelectorAll(".welcome-actions [data-screen]").forEach((button) => on(button, "click", async () => {
    switchScreen(button.dataset.screen);
    if (button.dataset.screen === "profile") await loadProfile();
    if (button.dataset.screen === "notes" && !state.selectedNoteId) resetNoteEditorForNewEntry();
  }));
  els.topScreenButtons.forEach((button) => on(button, "click", async () => {
    switchScreen(button.dataset.screen);
    if (button.dataset.screen === "profile") await loadProfile();
    if (button.dataset.screen === "notes" && !state.selectedNoteId) resetNoteEditorForNewEntry();
  }));
  on(els.shareAccessMode, "change", () => {
    if (els.shareRecipientField) els.shareRecipientField.classList.remove("hidden");
  });
  on(els.shareEncryptionType, "change", updateShareModalFields);
  
  on(els.sharedNoteUnlock, "click", async () => {
    if (!state.sharedPayload || state.sharedPayload.canView === false) return showToast(t().toasts.invalidKey);
    const encryptionType = detectShareEncryptionType(state.sharedPayload.encryptedContent, state.sharedPayload.encryptionType);
    
    // Symmetric encryption: only needs password
    // Public-key encryption: needs private key (personal diary unlock)
    if (encryptionType === "public-key" && !canReadSharedContent()) return showToast(t().toasts.needUnlock);
    if (encryptionType === "public-key" && (!hasActiveSession() || !hasStoredPrivateKeyForCurrentUser())) {
      updateShareAuthGate(state.sharedPayload);
      return showToast(state.language === "vi" ? "Hãy đăng nhập đúng tài khoản người nhận để mở ghi chú này." : "Please sign in with the recipient account to open this note.");
    }
    
    const password = encryptionType === "symmetric" ? (els.sharedNoteAccessKey?.value.trim() || "") : "";
    console.log("Unlocking shared note, encryptionType:", encryptionType, "password provided:", !!password, "password length:", password.length);
    const content = await decryptSharedPayload(state.sharedPayload, password);
    console.log("Decryption result:", content ? "success, content length:" + content.length : "failed");
    if (!content) return showToast(t().toasts.sharedUnlockFailed);

    const canEdit = Boolean(state.sharedPayload.canEdit && (state.sharedPayload.isOwner || state.sharedPayload.isRecipient));
    els.sharedNoteTitle.textContent = state.sharedPayload.title || "Shared note";
    if (els.sharedNoteTitleInput) {
      els.sharedNoteTitleInput.value = state.sharedPayload.title || "";
      els.sharedNoteTitleInput.readOnly = !canEdit;
    }
    if (els.sharedNoteEditor) {
      els.sharedNoteEditor.innerHTML = content;
      els.sharedNoteEditor.contentEditable = canEdit;
    }
    if (encryptionType === "symmetric") {
      state.sharedPayload.sharedPassword = password;
    }
    if (els.sharedToolbar) els.sharedToolbar.classList.toggle("hidden", !canEdit);
    if (els.sharedNoteSave) els.sharedNoteSave.classList.toggle("hidden", !canEdit);
    showToast(t().toasts.sharedUnlockSuccess);
  });
  
  on(els.sharedNoteSave, "click", async () => {
    try {
      if (!state.selectedSharedNoteId || !state.sharedPayload) return;
      const encryptionType = detectShareEncryptionType(state.sharedPayload.encryptedContent, state.sharedPayload.encryptionType);
      let encryptedContent = "";

      if (encryptionType === "public-key") {
        if (!state.sharedPayload.recipientId) return;
        const recipientPublicKey = await getRecipientPublicKey(state.sharedPayload.recipientId);
        encryptedContent = await window.NikkiSecurity.encryptContentWithPublicKey(els.sharedNoteEditor.innerHTML.trim(), recipientPublicKey);
      } else {
        const password = state.sharedPayload.sharedPassword || els.sharedNoteAccessKey?.value.trim() || "";
        if (!password) return showToast("Share password is required to save this note.");
        encryptedContent = await window.NikkiSecurity.encryptContentWithPassword(els.sharedNoteEditor.innerHTML.trim(), password);
      }

      await api(`/notes/shares/${state.selectedSharedNoteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: els.sharedNoteTitleInput.value.trim(),
          encryptedContent,
          encryptionType,
        }),
      });
      showToast(t().toasts.shareSaved);
      await refreshSharedNotes();
    } catch (error) { showToast(error.message); }
  });
  on(els.shareLoginSubmit, "click", async () => {
    try {
      const identifier = els.shareLoginIdentifier?.value.trim() || "";
      const password = els.shareLoginPassword?.value || "";
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
      setSession(data, password);
      await ensureUserKeyPair();
      const refreshed = await hydrateSharedPayloadFromSession(state.sharedPayload || { id: state.selectedSharedNoteId });
      if (refreshed) {
        state.sharedPayload = refreshed;
        updateSharedViewForEncryption(refreshed);
      }
      showToast(t().toasts.loginSuccess);
      await loadSharedNote();
    } catch (error) { showToast(error.message); }
  });
  
  loadSharedNote().then((shared) => {
    if (shared) return;
    if (!state.token || !state.user || !state.hasAuthenticatedInSession) return goToHome();
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
    if (action === "switch") { clearSession(); showToast(t().toasts.switchAccount); return goToLogin(); }
    if (action === "logout") { clearSession(); showToast(t().toasts.logout); return goToHome(); }
  }));
  
  document.querySelectorAll(".editor-toolbar:not(.shared-toolbar) button[data-command]").forEach((button) => on(button, "click", () => {
    if (!ensureNotesUnlockedForAction()) return;
    formatEditor(button.dataset.command, button.dataset.value);
  }));
  
  on(els.fontSizeSelect, "change", () => {
    const value = els.fontSizeSelect.value;
    if (!value) return;
    if (!ensureNotesUnlockedForAction()) return;
    formatEditor("fontSize", value);
    els.fontSizeSelect.value = "";
  });
  
  on(els.fontFamilySelect, "change", () => {
    if (!els.fontFamilySelect.value) return;
    if (!ensureNotesUnlockedForAction()) return;
    formatEditor("fontName", els.fontFamilySelect.value);
  });
  
  on(els.fontColorInput, "change", () => {
    if (!els.fontColorInput.value) return;
    if (!ensureNotesUnlockedForAction()) return;
    formatEditor("foreColor", els.fontColorInput.value);
  });
  
  on(els.highlightColorInput, "change", () => {
    if (!els.highlightColorInput.value) return;
    if (!ensureNotesUnlockedForAction()) return;
    formatEditor("hiliteColor", els.highlightColorInput.value);
  });
  bindColorPalette("#note-color-palette", "foreColor", "font-color-advanced-toggle", "font-color");
  bindColorPalette("#note-highlight-palette", "hiliteColor", "highlight-color-advanced-toggle", "highlight-color");
  
  on(els.clearFormat, "click", () => formatEditor("removeFormat"));
  
  if (els.sharedToolbar) {
    els.sharedToolbar.querySelectorAll("button[data-command]").forEach((button) => on(button, "click", () => formatEditor(button.dataset.command, button.dataset.value, els.sharedNoteEditor)));
    on(els.sharedFontSizeSelect, "change", () => formatEditor("fontSize", els.sharedFontSizeSelect.value, els.sharedNoteEditor));
    on(els.sharedFontFamilySelect, "change", () => formatEditor("fontName", els.sharedFontFamilySelect.value, els.sharedNoteEditor));
    on(els.sharedFontColor, "input", () => formatEditor("foreColor", els.sharedFontColor.value, els.sharedNoteEditor));
    on(els.sharedHighlightColor, "input", () => formatEditor("hiliteColor", els.sharedHighlightColor.value, els.sharedNoteEditor));
    on(els.sharedClearFormat, "click", () => formatEditor("removeFormat", null, els.sharedNoteEditor));
  }
  
  on(els.downloadWord, "click", downloadCurrentNoteAsWord);
  on(els.noteSearch, "input", renderNotes);
  on(els.notesToolbarKey, "keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    confirmUnlockNotes();
  });
  on(els.unlockNotes, "click", () => {
    if (state.notesUnlocked) {
      state.notesUnlocked = false;
      state.personalKey = "";
      if (els.notesToolbarKey) els.notesToolbarKey.value = "";
      sessionStorage.removeItem("personalKey");
      if (state.sharedPayload && els.sharedNoteEditor) {
        els.sharedNoteEditor.innerHTML = state.sharedPayload.encryptedContent || "";
        els.sharedNoteEditor.contentEditable = false;
        if (els.sharedToolbar) els.sharedToolbar.classList.add("hidden");
        if (els.sharedNoteSave) els.sharedNoteSave.classList.add("hidden");
        if (els.sharedNoteUnlock) els.sharedNoteUnlock.classList.remove("hidden");
        updateSharedViewForEncryption(state.sharedPayload);
      }
      resetNoteEditorForNewEntry();
      closeNoteModal();
      renderDashboardStats();
      updateUnlockStateUI();
      renderNotes();
      return showToast(t().toasts.lockSuccess);
    }
    openUnlockNotesModal();
  });
  
  on(els.saveNote, "click", saveNote);
  on(els.shareNote, "click", shareSelectedNote);
  on(els.fab, "click", () => {
    if (!ensureNotesUnlockedForAction()) return;
    switchScreen("notes");
    prepareNewNoteModal();
  });
  on(els.saveProfile, "click", saveProfile);
  on(els.openSecurityPanel, "click", () => openModal(els.securityModal));
  document.querySelectorAll("[data-close-modal]").forEach((button) => on(button, "click", () => closeModal(byId(button.dataset.closeModal))));
  on(els.showPrivateKey, "click", () => {
    state.rsaPrivateKeyVisible = !state.rsaPrivateKeyVisible;
    updateSecurityKeyUI();
  });
  on(els.copyPrivateKey, "click", async () => {
    const privateKey = getStoredPrivateKey();
    if (!privateKey) return showToast("No private key is stored in this browser.");
    await window.NikkiSecurity.copyText(privateKey);
    showToast("Private key copied.");
  });
  on(els.downloadPrivateKey, "click", () => {
    const privateKey = getStoredPrivateKey();
    if (!privateKey || !state.user) return showToast("No private key is stored in this browser.");
    window.NikkiSecurity.downloadTextFile(`nikki-private-key-${state.user.username || state.user.uid}.pem`, privateKey);
    showToast("Private key downloaded.");
  });
  on(els.regenerateKeyPair, "click", async () => {
    try {
      await ensureUserKeyPair(true);
      state.notesUnlocked = false;
      renderDashboardStats();
      updateUnlockStateUI();
      updateSecurityKeyUI();
      showToast("RSA key pair regenerated.");
    } catch (error) { showToast(error.message); }
  });
  on(els.securityOptionRsa, "click", () => {
    updateSecurityKeyUI();
    openSecurityStepModal(els.securityKeypairModal);
  });
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
  on(els.securityKeypairClose, "click", () => closeModal(els.securityKeypairModal));
  on(els.securityPasswordClose, "click", () => closeModal(els.securityPasswordModal));
  on(els.personalKeyClose, "click", () => closeModal(els.personalKeyModal));
  on(els.deleteAccountClose, "click", () => closeModal(els.deleteAccountModal));
  on(els.profileAccessClose, "click", () => closeModal(els.profileAccessModal));
  on(els.profileOtpClose, "click", () => closeModal(els.profileOtpModal));
  on(els.profileAccessForgot, "click", requestRecoveryOtp);
  on(els.profileOtpSubmit, "click", confirmProfileAccessOtp);
  on(els.recoverySubmit, "click", confirmRecoveryOtp);
  on(els.recoveryClose, "click", () => closeModal(els.recoveryModal));
  on(els.noteModalClose, "click", closeNoteModal);
  on(els.sharedViewClose, "click", () => {
    state.sharedViewOrigin = "dashboard";
    switchScreen(state.previousScreen || "shared-notes");
  });
  
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
  
  on(els.shareKeyConfirm, "click", confirmShareSelectedNote);
  on(els.shareKeyClose, "click", () => closeModal(els.shareKeyModal));
}

initCommonEvents();
if (page === "home") initHomePage();
if (page === "login") initLoginPage();
if (page === "dashboard") initDashboardPage();



