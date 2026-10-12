export type LegalKind = 'terms' | 'privacy' | 'about';
export type Lang = 'vi' | 'en';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const VI_TERMS: LegalDoc = {
  title: `Điều khoản dịch vụ`,
  updated: `Cập nhật lần cuối: 11/10/2026`,
  intro: `Vui lòng đọc kỹ Điều khoản dịch vụ này trước khi đăng ký hoặc sử dụng VietnamDong. Khi tạo tài khoản, đăng nhập hoặc tiếp tục sử dụng dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi các điều khoản dưới đây cùng Chính sách bảo mật.`,
  sections: [
    {
      heading: `1. Định nghĩa`,
      items: [
        `"Dịch vụ" là website, ứng dụng web (PWA) và các tính năng do VietnamDong cung cấp, gồm nhiệm vụ rút gọn link, điểm danh, vòng quay, nhiệm vụ tuần/tháng, bảng xếp hạng, giới thiệu bạn bè, Creator Code, đổi thưởng, rút tiền và Vietsub Studio.`,
        `"VNC" là đơn vị điểm thưởng nội bộ của Dịch vụ (một số tên trường kỹ thuật có thể ghi là "nova").`,
        `"Admin" là người quản trị được VietnamDong ủy quyền xem xét, phê duyệt hoặc từ chối các yêu cầu của người dùng.`,
        `"Bạn" là cá nhân tạo tài khoản và sử dụng Dịch vụ.`,
      ],
    },
    {
      heading: `2. Điều kiện sử dụng và tài khoản`,
      items: [
        `Bạn phải từ đủ 16 tuổi. Nếu bạn dưới 18 tuổi, bạn cam kết đã được cha mẹ hoặc người giám hộ hợp pháp đồng ý cho sử dụng Dịch vụ và đồng ý các điều khoản này.`,
        `Mỗi người chỉ được sở hữu một (01) tài khoản. Thông tin đăng ký phải chính xác, đầy đủ và được cập nhật khi thay đổi.`,
        `Bạn tự chịu trách nhiệm bảo mật mật khẩu, thiết bị và các phương thức đăng nhập (email, Discord, Google). Chúng tôi khuyến nghị bật xác thực 2 lớp (2FA) tại trang Bảo mật.`,
        `Mọi hoạt động phát sinh từ tài khoản của bạn được xem là do bạn thực hiện, trừ khi bạn chứng minh được tài khoản bị chiếm đoạt và đã báo ngay cho chúng tôi.`,
        `Bạn không được mua, bán, cho thuê, tặng hoặc chuyển nhượng tài khoản cho người khác.`,
      ],
    },
    {
      heading: `3. Bản chất của VNC`,
      items: [
        `VNC là điểm thưởng nội bộ, chỉ có giá trị trong hệ thống VietnamDong. VNC không phải là tiền tệ, tiền điện tử, tài sản số được pháp luật công nhận, chứng khoán hay phương tiện thanh toán hợp pháp.`,
        `VNC không phát sinh lãi, không được bảo đảm giá trị và không thể mua bán, trao đổi bên ngoài Dịch vụ. Mọi giao dịch VNC ngoài Dịch vụ (nếu có) đều nằm ngoài sự kiểm soát và trách nhiệm của chúng tôi.`,
        `Tỷ giá quy đổi VNC sang VNĐ được hiển thị trên Dịch vụ và có thể được điều chỉnh theo thời gian. Tỷ giá áp dụng cho một yêu cầu là tỷ giá có hiệu lực tại thời điểm yêu cầu được tạo, trừ khi chúng tôi thông báo khác.`,
        `Số dư VNC hiển thị là số liệu tham chiếu theo sổ cái của hệ thống. Khi có sai lệch do lỗi kỹ thuật, chúng tôi có quyền đối soát và điều chỉnh về đúng giá trị.`,
      ],
    },
    {
      heading: `4. Nhiệm vụ và cách nhận thưởng`,
      items: [
        `Nhiệm vụ rút gọn link được cung cấp thông qua các nhà cung cấp dịch vụ rút gọn link bên thứ ba. Bạn phải hoàn thành nhiệm vụ trung thực, theo đúng hướng dẫn, bằng thao tác thủ công của chính bạn.`,
        `VNC chỉ được ghi nhận khi nhiệm vụ được xác nhận hợp lệ. Chúng tôi không bảo đảm nhiệm vụ luôn có sẵn, và có thể thêm, sửa, tạm ngừng hoặc xóa nhiệm vụ bất cứ lúc nào.`,
        `Phần thưởng từ điểm danh, vòng quay, nhiệm vụ tuần/tháng, bảng xếp hạng hoặc chương trình khuyến mãi tuân theo điều kiện công bố tại từng tính năng. Phần thưởng có thể bị từ chối hoặc thu hồi nếu có dấu hiệu gian lận hoặc lỗi hệ thống.`,
      ],
    },
    {
      heading: `5. Rút tiền, đổi thưởng và mua Vietsub Studio`,
      items: [
        `Mọi yêu cầu rút tiền, đổi thưởng và mua Vietsub Studio đều cần Admin duyệt thủ công. Việc tạo yêu cầu không đồng nghĩa với việc được chấp thuận.`,
        `Thời gian xử lý thông thường khoảng 24 giờ nhưng chỉ mang tính tham khảo, có thể lâu hơn do kiểm tra an ninh, ngày nghỉ hoặc sự cố của đối tác thanh toán.`,
        `Chúng tôi có quyền yêu cầu bổ sung thông tin xác minh, từ chối hoặc tạm giữ yêu cầu khi có dấu hiệu bất thường, vi phạm điều khoản hoặc theo yêu cầu của cơ quan có thẩm quyền. Khi yêu cầu bị từ chối vì lý do không phải do lỗi của bạn, số VNC liên quan sẽ được hoàn lại vào tài khoản.`,
        `Bạn phải cung cấp chính xác thông tin nhận (số ví, tài khoản ngân hàng, thông tin đơn hàng). Chúng tôi không chịu trách nhiệm đối với khoản đã xử lý theo đúng thông tin bạn cung cấp nhưng thông tin đó bị sai.`,
        `Phải đạt mức rút tối thiểu và đã xác thực email (nếu đăng ký bằng email) theo quy định hiển thị tại trang Ví và Đổi thưởng. Thẻ cào và dịch vụ số do đối tác cung cấp chỉ được xử lý sau khi Admin phê duyệt.`,
        `Vietsub Studio: khóa bản quyền (license key) dành cho cá nhân đã mua, không được chia sẻ, bán lại hoặc công khai. Khóa bị lộ do lỗi của bạn có thể bị thu hồi. Quy định hoàn tiền áp dụng theo pháp luật về bảo vệ quyền lợi người tiêu dùng và theo chính sách được thông báo tại thời điểm mua.`,
      ],
    },
    {
      heading: `6. Giới thiệu bạn bè và Creator Code`,
      items: [
        `Hoa hồng giới thiệu và hoa hồng Creator Code được tính theo tỷ lệ công bố trong hệ thống và chỉ phát sinh từ hoạt động hợp lệ của người được giới thiệu.`,
        `Cấm tự giới thiệu, tạo tài khoản ảo để nhận hoa hồng, hoặc quảng bá bằng thông tin sai sự thật, gây hiểu nhầm về mức thu nhập hoặc về bản chất của VNC.`,
        `Chúng tôi có thể thay đổi, tạm ngừng hoặc chấm dứt chương trình giới thiệu và thu hồi hoa hồng phát sinh từ hành vi vi phạm.`,
      ],
    },
    {
      heading: `7. Hành vi bị cấm`,
      paragraphs: [`Bạn không được thực hiện, hỗ trợ hoặc khuyến khích các hành vi sau:`],
      items: [
        `Tạo nhiều tài khoản, dùng tài khoản của người khác hoặc đăng ký hàng loạt từ cùng một địa chỉ IP/thiết bị.`,
        `Dùng bot, script, công cụ tự động, phần mềm giả lập, tool bypass, VPN/proxy nhằm gian lận hoặc né kiểm tra, hoặc can thiệp vào nhiệm vụ của nhà cung cấp.`,
        `Khai thác lỗi hệ thống, tấn công, dò quét, tìm cách truy cập trái phép, làm quá tải hoặc làm gián đoạn Dịch vụ.`,
        `Giả mạo danh tính, giả mạo Admin, lừa đảo người dùng khác, chiếm đoạt tài khoản hoặc thông tin của người khác.`,
        `Sử dụng Dịch vụ cho mục đích rửa tiền, gian lận thanh toán, hoặc bất kỳ hoạt động nào trái pháp luật Việt Nam.`,
        `Đăng hoặc gửi nội dung vi phạm pháp luật, xúc phạm, quấy rối, spam hoặc xâm phạm quyền của người khác (bao gồm nội dung tại mục Hỗ trợ).`,
        `Chuyển VNC nội bộ nhằm lách quy định, trục lợi hoặc phục vụ giao dịch mua bán ngoài hệ thống.`,
      ],
    },
    {
      heading: `8. Chống gian lận, khóa và thu hồi`,
      items: [
        `Chúng tôi áp dụng giới hạn đăng ký theo địa chỉ IP và hệ thống phát hiện bất thường tự động (ví dụ số lượng nhiệm vụ hoàn thành bất thường trong thời gian ngắn). Tài khoản bị nghi ngờ có thể bị khóa tạm thời để kiểm tra.`,
        `Khi xác định có vi phạm, chúng tôi có quyền hủy phần thưởng, thu hồi VNC, từ chối rút tiền, khóa hoặc chấm dứt tài khoản mà không cần báo trước, tùy mức độ vi phạm.`,
        `Nếu cho rằng tài khoản bị khóa nhầm, bạn có thể gửi khiếu nại qua mục Hỗ trợ kèm thông tin để chúng tôi xem xét lại. Quyết định cuối cùng thuộc về chúng tôi, không làm mất các quyền mà pháp luật cho phép bạn.`,
      ],
    },
    {
      heading: `9. Dịch vụ và liên kết của bên thứ ba`,
      items: [
        `Dịch vụ có tích hợp hoặc dẫn tới bên thứ ba như nhà cung cấp rút gọn link, Discord, Google, Cloudflare Turnstile, dịch vụ gửi email và đối tác thẻ cào/thanh toán. Mỗi bên có điều khoản và chính sách riêng.`,
        `Chúng tôi không kiểm soát và không chịu trách nhiệm về nội dung, quảng cáo, phần mềm hoặc thiệt hại phát sinh từ website của bên thứ ba. Hãy thận trọng, không tải hoặc cài đặt phần mềm không rõ nguồn gốc khi làm nhiệm vụ.`,
      ],
    },
    {
      heading: `10. Thuế và nghĩa vụ pháp lý`,
      items: [
        `Bạn tự chịu trách nhiệm kê khai và nộp các loại thuế, phí (nếu có) phát sinh từ thu nhập của mình theo pháp luật Việt Nam.`,
        `Chúng tôi có thể cung cấp thông tin cần thiết cho cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp bằng văn bản.`,
      ],
    },
    {
      heading: `11. Quyền sở hữu trí tuệ`,
      items: [
        `Tên VietnamDong, logo, giao diện, mã nguồn và nội dung do chúng tôi tạo ra thuộc quyền sở hữu của chúng tôi hoặc bên cấp phép. Bạn không được sao chép, sửa đổi, phân phối hoặc khai thác thương mại nếu chưa có sự đồng ý bằng văn bản.`,
        `Nội dung bạn gửi (như ticket hỗ trợ) vẫn thuộc về bạn, nhưng bạn cho phép chúng tôi sử dụng để xử lý yêu cầu, vận hành và cải thiện Dịch vụ.`,
      ],
    },
    {
      heading: `12. Miễn trừ và giới hạn trách nhiệm`,
      items: [
        `Dịch vụ được cung cấp trên cơ sở "hiện có". Chúng tôi không cam kết Dịch vụ hoạt động liên tục, không lỗi hoặc không bị gián đoạn, và không bảo đảm mức thu nhập nào cho bạn. Kết quả kiếm VNC phụ thuộc vào nhiệm vụ khả dụng và việc bạn tuân thủ điều khoản.`,
        `Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm đối với thiệt hại gián tiếp, mất lợi nhuận, mất dữ liệu hoặc thiệt hại do sự kiện bất khả kháng, sự cố của bên thứ ba, hoặc do bạn vi phạm điều khoản. Trách nhiệm tối đa của chúng tôi (nếu có) không vượt quá giá trị yêu cầu giao dịch đang tranh chấp.`,
        `Không nội dung nào trong điều khoản này loại trừ hay hạn chế các quyền bắt buộc của người tiêu dùng và các trách nhiệm mà pháp luật Việt Nam không cho phép loại trừ.`,
      ],
    },
    {
      heading: `13. Tạm ngừng và chấm dứt`,
      items: [
        `Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản qua mục Hỗ trợ. Các yêu cầu đang xử lý sẽ được hoàn tất hoặc hoàn trả trước khi xóa, và chúng tôi có thể giữ lại dữ liệu cần thiết theo quy định pháp luật.`,
        `Chúng tôi có thể tạm ngừng hoặc chấm dứt Dịch vụ hoặc tài khoản của bạn khi bạn vi phạm điều khoản, theo yêu cầu của cơ quan nhà nước, hoặc khi ngừng vận hành. Nếu ngừng Dịch vụ, chúng tôi sẽ cố gắng thông báo trước và xử lý hợp lý số dư hợp lệ.`,
      ],
    },
    {
      heading: `14. Thay đổi điều khoản`,
      items: [
        `Chúng tôi có thể cập nhật điều khoản bất cứ lúc nào. Thay đổi quan trọng sẽ được thông báo trên website hoặc trong ứng dụng. Việc bạn tiếp tục sử dụng Dịch vụ sau ngày hiệu lực được xem là chấp nhận điều khoản mới; nếu không đồng ý, bạn cần ngừng sử dụng.`,
      ],
    },
    {
      heading: `15. Luật áp dụng và giải quyết tranh chấp`,
      items: [
        `Điều khoản này được điều chỉnh bởi pháp luật nước Cộng hòa xã hội chủ nghĩa Việt Nam.`,
        `Tranh chấp trước hết được giải quyết bằng thương lượng, hòa giải thiện chí. Nếu không thành, tranh chấp được đưa ra Tòa án có thẩm quyền tại Việt Nam giải quyết.`,
        `Nếu một điều khoản bị tuyên vô hiệu hoặc không thể thi hành, các điều khoản còn lại vẫn có hiệu lực.`,
      ],
    },
    {
      heading: `16. Liên hệ`,
      paragraphs: [`Mọi thắc mắc, khiếu nại hoặc yêu cầu liên quan đến điều khoản, vui lòng gửi ticket tại trang Hỗ trợ hoặc dùng thông tin liên hệ ở cuối trang.`],
    },
  ],
};

const EN_TERMS: LegalDoc = {
  title: `Terms of Service`,
  updated: `Last updated: 11 Oct 2026`,
  intro: `Please read these Terms of Service carefully before registering for or using VietnamDong. By creating an account, logging in or continuing to use the service, you confirm that you have read, understood and agree to be bound by these terms and the Privacy Policy.`,
  sections: [
    {
      heading: `1. Definitions`,
      items: [
        `"Service" means the website, web app (PWA) and features provided by VietnamDong, including shortlink tasks, daily check-in, lucky wheel, weekly/monthly quests, leaderboards, referrals, Creator Codes, redemption, withdrawals and Vietsub Studio.`,
        `"VNC" means the internal reward points of the Service (some technical field names may say "nova").`,
        `"Admin" means an administrator authorized by VietnamDong to review, approve or reject user requests.`,
        `"You" means the individual who creates an account and uses the Service.`,
      ],
    },
    {
      heading: `2. Eligibility and accounts`,
      items: [
        `You must be at least 16 years old. If you are under 18, you confirm that a parent or legal guardian has permitted you to use the Service and agrees to these terms.`,
        `Each person may own only one (1) account. Registration information must be accurate, complete and kept up to date.`,
        `You are responsible for securing your password, devices and login methods (email, Discord, Google). We recommend enabling two-factor authentication (2FA) on the Security page.`,
        `All activity under your account is deemed to be yours unless you can show the account was compromised and you reported it to us promptly.`,
        `You may not buy, sell, rent, give away or transfer your account.`,
      ],
    },
    {
      heading: `3. Nature of VNC`,
      items: [
        `VNC is an internal reward point with value only inside VietnamDong. It is not currency, cryptocurrency, a legally recognized digital asset, a security, or a lawful means of payment.`,
        `VNC bears no interest, has no guaranteed value, and may not be bought, sold or exchanged outside the Service. Any off-platform VNC dealings are outside our control and responsibility.`,
        `The VNC to VND rate is shown in the Service and may change over time. The rate applied to a request is the one in effect when the request is created, unless we announce otherwise.`,
        `Displayed VNC balances reflect the system ledger. If a technical error causes a discrepancy, we may reconcile and correct it.`,
      ],
    },
    {
      heading: `4. Tasks and rewards`,
      items: [
        `Shortlink tasks are provided through third-party shortlink providers. You must complete tasks honestly, as instructed, using your own manual actions.`,
        `VNC is credited only when a task is verified as valid. We do not guarantee that tasks are always available and may add, change, pause or remove tasks at any time.`,
        `Rewards from check-in, the lucky wheel, quests, leaderboards or promotions follow the conditions published for each feature. Rewards may be refused or revoked in case of suspected fraud or system errors.`,
      ],
    },
    {
      heading: `5. Withdrawals, redemptions and Vietsub Studio`,
      items: [
        `Every withdrawal, redemption and Vietsub Studio purchase requires manual Admin approval. Submitting a request does not mean it will be approved.`,
        `Typical processing time is about 24 hours, for reference only; it may take longer due to security checks, holidays or payment partner issues.`,
        `We may request verification, reject or hold a request when we see anomalies, violations, or when required by a competent authority. If a request is rejected for reasons not caused by you, the related VNC is returned to your account.`,
        `You must provide accurate payout details (wallet, bank account, order information). We are not liable for payouts processed according to the details you provided if those details were wrong.`,
        `You must meet the minimum withdrawal amount and verify your email (if you registered with email) as shown on the Wallet and Redeem pages. Cards and digital services from partners are processed only after Admin approval.`,
        `Vietsub Studio: the license key is for the purchasing individual and may not be shared, resold or published. Keys leaked through your fault may be revoked. Refunds follow consumer protection law and the policy announced at the time of purchase.`,
      ],
    },
    {
      heading: `6. Referrals and Creator Codes`,
      items: [
        `Referral and Creator Code commissions are calculated at the rates published in the system and arise only from valid activity of referred users.`,
        `Self-referral, creating fake accounts to earn commission, or promoting with false information or misleading claims about income or the nature of VNC is prohibited.`,
        `We may change, pause or end the referral program and revoke commissions arising from violations.`,
      ],
    },
    {
      heading: `7. Prohibited conduct`,
      paragraphs: [`You must not perform, assist or encourage the following:`],
      items: [
        `Creating multiple accounts, using another person's account, or mass-registering from the same IP address/device.`,
        `Using bots, scripts, automation, emulators, bypass tools, or VPN/proxy to cheat or evade checks, or interfering with provider tasks.`,
        `Exploiting bugs, attacking, scanning, attempting unauthorized access, or overloading or disrupting the Service.`,
        `Impersonating others or Admins, scamming users, or taking over accounts or information of others.`,
        `Using the Service for money laundering, payment fraud, or any activity that is unlawful under Vietnamese law.`,
        `Posting or sending unlawful, abusive, harassing or spam content, or content infringing others' rights (including in Support tickets).`,
        `Transferring VNC internally to evade rules, profit improperly, or support off-platform trading.`,
      ],
    },
    {
      heading: `8. Anti-fraud, locks and clawbacks`,
      items: [
        `We apply per-IP registration limits and automated anomaly detection (for example an unusual number of tasks completed in a short time). Suspected accounts may be temporarily locked for review.`,
        `When a violation is established, we may cancel rewards, revoke VNC, reject withdrawals, and lock or terminate the account without prior notice, depending on severity.`,
        `If you believe your account was locked by mistake, submit an appeal via Support with relevant details. Our decision is final, without affecting rights granted to you by law.`,
      ],
    },
    {
      heading: `9. Third-party services and links`,
      items: [
        `The Service integrates with or links to third parties such as shortlink providers, Discord, Google, Cloudflare Turnstile, email delivery and card/payment partners. Each has its own terms and policies.`,
        `We do not control and are not responsible for content, ads, software or damage arising from third-party websites. Be careful and do not download or install software of unknown origin while doing tasks.`,
      ],
    },
    {
      heading: `10. Taxes and legal obligations`,
      items: [
        `You are responsible for declaring and paying any taxes or fees arising from your income under Vietnamese law.`,
        `We may disclose necessary information to competent state authorities upon a lawful written request.`,
      ],
    },
    {
      heading: `11. Intellectual property`,
      items: [
        `The VietnamDong name, logo, interface, source code and content we create belong to us or our licensors. You may not copy, modify, distribute or commercially exploit them without written consent.`,
        `Content you submit (such as support tickets) remains yours, but you allow us to use it to handle requests, and to operate and improve the Service.`,
      ],
    },
    {
      heading: `12. Disclaimers and limitation of liability`,
      items: [
        `The Service is provided "as is". We do not promise uninterrupted or error-free operation and do not guarantee any level of income. Your VNC earnings depend on available tasks and your compliance with these terms.`,
        `To the extent permitted by law, we are not liable for indirect damages, lost profits, data loss, or damage from force majeure, third-party failures, or your breach of these terms. Our maximum liability (if any) will not exceed the value of the disputed transaction request.`,
        `Nothing in these terms excludes or limits mandatory consumer rights or liabilities that Vietnamese law does not permit to be excluded.`,
      ],
    },
    {
      heading: `13. Suspension and termination`,
      items: [
        `You may stop using the Service and request account deletion via Support. Pending requests will be completed or reversed before deletion, and we may retain data required by law.`,
        `We may suspend or terminate the Service or your account if you breach these terms, if required by a state authority, or if we cease operations. If we discontinue the Service, we will try to give notice and handle valid balances reasonably.`,
      ],
    },
    {
      heading: `14. Changes to these terms`,
      items: [
        `We may update these terms at any time. Material changes will be announced on the website or in the app. Continued use after the effective date means you accept the new terms; if you disagree, you must stop using the Service.`,
      ],
    },
    {
      heading: `15. Governing law and disputes`,
      items: [
        `These terms are governed by the laws of the Socialist Republic of Vietnam.`,
        `Disputes are first settled through good-faith negotiation and mediation. If unresolved, they will be brought before a competent court in Vietnam.`,
        `If any provision is held invalid or unenforceable, the remaining provisions stay in effect.`,
      ],
    },
    {
      heading: `16. Contact`,
      paragraphs: [`For questions, complaints or requests about these terms, please submit a ticket on the Support page or use the contact details at the bottom of the page.`],
    },
  ],
};

const VI_PRIVACY: LegalDoc = {
  title: `Điều khoản bảo mật`,
  updated: `Cập nhật lần cuối: 11/10/2026`,
  intro: `Chính sách này giải thích VietnamDong thu thập, sử dụng, chia sẻ và bảo vệ dữ liệu cá nhân của bạn như thế nào, phù hợp với Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và các quy định pháp luật Việt Nam liên quan. Khi đăng ký hoặc sử dụng Dịch vụ, bạn đồng ý cho chúng tôi xử lý dữ liệu theo chính sách này.`,
  sections: [
    {
      heading: `1. Dữ liệu chúng tôi thu thập`,
      items: [
        `Dữ liệu tài khoản: tên đăng nhập, email, mật khẩu (chỉ lưu dạng băm, không lưu mật khẩu gốc), ảnh đại diện và mã định danh từ Discord hoặc Google khi bạn đăng nhập bằng các phương thức này.`,
        `Dữ liệu giao dịch: số dư VNC, lịch sử nhiệm vụ, điểm danh, chuyển khoản nội bộ, giới thiệu, đơn đổi thưởng, yêu cầu rút tiền, đơn Vietsub Studio.`,
        `Thông tin nhận tiền bạn cung cấp: số ví điện tử, tài khoản ngân hàng, thông tin nhận thẻ hoặc dịch vụ.`,
        `Dữ liệu kỹ thuật và an ninh: địa chỉ IP (gồm IP lúc đăng ký), nhật ký truy cập, dữ liệu chống gian lận, thời điểm đồng ý điều khoản.`,
        `Dữ liệu bảo mật 2FA: khóa bí mật TOTP nếu bạn bật xác thực 2 lớp.`,
        `Nội dung bạn gửi: ticket và tin nhắn hỗ trợ.`,
      ],
    },
    {
      heading: `2. Mục đích và cơ sở xử lý`,
      items: [
        `Tạo và quản lý tài khoản, xác thực đăng nhập, cung cấp các tính năng của Dịch vụ.`,
        `Ghi nhận phần thưởng, xử lý rút tiền, đổi thưởng và mua hàng sau khi Admin phê duyệt.`,
        `Phòng chống gian lận, bảo vệ an ninh hệ thống, thực thi điều khoản (như giới hạn đăng ký theo IP, phát hiện bất thường).`,
        `Hỗ trợ khách hàng, gửi thông báo và email liên quan đến tài khoản (xác thực email, đặt lại mật khẩu).`,
        `Tuân thủ nghĩa vụ pháp lý và yêu cầu của cơ quan có thẩm quyền.`,
        `Cơ sở xử lý là sự đồng ý của bạn, việc thực hiện dịch vụ bạn yêu cầu, lợi ích hợp pháp về an ninh và nghĩa vụ theo luật.`,
      ],
    },
    {
      heading: `3. Chia sẻ dữ liệu`,
      paragraphs: [`Chúng tôi không bán dữ liệu cá nhân của bạn. Dữ liệu chỉ được chia sẻ trong phạm vi cần thiết với:`],
      items: [
        `Nhà cung cấp hạ tầng và lưu trữ (hosting, cơ sở dữ liệu), dịch vụ gửi email.`,
        `Cloudflare Turnstile để xác thực captcha; Discord và Google khi bạn chọn đăng nhập bằng các dịch vụ này.`,
        `Đối tác thẻ cào/thanh toán, chỉ khi Admin phê duyệt yêu cầu đổi thưởng hoặc rút tiền của bạn.`,
        `Nhà cung cấp rút gọn link: khi bạn bắt đầu nhiệm vụ, nhà cung cấp có thể thu thập dữ liệu theo chính sách riêng của họ.`,
        `Cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp.`,
        `Tên đăng nhập và số liệu xếp hạng của bạn có thể hiển thị công khai trên bảng xếp hạng.`,
      ],
    },
    {
      heading: `4. Cookie và lưu trữ cục bộ`,
      items: [
        `Cookie phiên đăng nhập (httpOnly) dùng để duy trì đăng nhập an toàn.`,
        `Bộ nhớ trình duyệt dùng để lưu ngôn ngữ, giao diện sáng/tối và mã giới thiệu tạm thời.`,
        `Chúng tôi không dùng cookie quảng cáo theo dõi của bên thứ ba. Bạn có thể xóa cookie trong trình duyệt, nhưng khi đó có thể phải đăng nhập lại.`,
      ],
    },
    {
      heading: `5. Lưu trữ và bảo mật`,
      items: [
        `Mật khẩu được băm bằng thuật toán một chiều; phiên đăng nhập dùng token có chữ ký; các API nhạy cảm có giới hạn tần suất và kiểm tra captcha.`,
        `Chúng tôi khuyến nghị bật xác thực 2 lớp. Không hệ thống nào an toàn tuyệt đối; bạn nên dùng mật khẩu mạnh, duy nhất và không chia sẻ mã xác thực.`,
        `Dữ liệu được lưu trong thời gian tài khoản còn hoạt động và thêm một khoảng thời gian hợp lý sau đó để giải quyết khiếu nại, phòng chống gian lận hoặc tuân thủ pháp luật, rồi được xóa hoặc ẩn danh khi không còn cần thiết.`,
        `Nếu xảy ra sự cố ảnh hưởng đến dữ liệu cá nhân, chúng tôi sẽ xử lý và thông báo theo quy định pháp luật.`,
      ],
    },
    {
      heading: `6. Chuyển dữ liệu ra nước ngoài`,
      items: [
        `Một số nhà cung cấp hạ tầng và dịch vụ bên thứ ba có thể đặt máy chủ ngoài lãnh thổ Việt Nam. Khi sử dụng Dịch vụ, bạn hiểu và đồng ý dữ liệu có thể được xử lý ở nước ngoài với biện pháp bảo vệ phù hợp.`,
      ],
    },
    {
      heading: `7. Quyền của bạn`,
      paragraphs: [`Theo quy định pháp luật, bạn có quyền:`],
      items: [
        `Được biết, truy cập và yêu cầu cung cấp bản sao dữ liệu cá nhân của mình.`,
        `Chỉnh sửa dữ liệu không chính xác.`,
        `Rút lại sự đồng ý, hạn chế hoặc phản đối việc xử lý; yêu cầu xóa dữ liệu, trừ trường hợp pháp luật cho phép hoặc yêu cầu chúng tôi lưu giữ.`,
        `Khiếu nại, khởi kiện hoặc yêu cầu bồi thường theo quy định.`,
      ],
    },
    {
      heading: `8. Người dưới 16 tuổi`,
      items: [
        `Dịch vụ dành cho người từ đủ 16 tuổi. Nếu chúng tôi phát hiện tài khoản của người dưới 16 tuổi, chúng tôi có thể khóa hoặc xóa tài khoản và dữ liệu liên quan.`,
      ],
    },
    {
      heading: `9. Thay đổi chính sách`,
      items: [
        `Chúng tôi có thể cập nhật chính sách này và sẽ thông báo thay đổi quan trọng trên website hoặc trong ứng dụng. Việc tiếp tục sử dụng sau ngày hiệu lực là chấp nhận bản cập nhật.`,
      ],
    },
    {
      heading: `10. Liên hệ`,
      paragraphs: [`Để thực hiện quyền của bạn hoặc hỏi về dữ liệu cá nhân, hãy gửi ticket tại trang Hỗ trợ hoặc dùng thông tin liên hệ ở cuối trang.`],
    },
  ],
};

const EN_PRIVACY: LegalDoc = {
  title: `Privacy Policy`,
  updated: `Last updated: 11 Oct 2026`,
  intro: `This policy explains how VietnamDong collects, uses, shares and protects your personal data, in line with Decree 13/2023/ND-CP on personal data protection and related Vietnamese laws. By registering for or using the Service, you agree to our processing of data under this policy.`,
  sections: [
    {
      heading: `1. Data we collect`,
      items: [
        `Account data: username, email, password (stored only as a hash, never in plain text), avatar and identifiers from Discord or Google if you sign in with them.`,
        `Transaction data: VNC balance, task history, check-ins, internal transfers, referrals, redemption orders, withdrawal requests, Vietsub Studio orders.`,
        `Payout details you provide: e-wallet number, bank account, details for receiving cards or services.`,
        `Technical and security data: IP address (including registration IP), access logs, anti-fraud data, time you accepted the terms.`,
        `2FA security data: a TOTP secret key if you enable two-factor authentication.`,
        `Content you submit: support tickets and messages.`,
      ],
    },
    {
      heading: `2. Purposes and legal basis`,
      items: [
        `Creating and managing accounts, authenticating logins, providing Service features.`,
        `Crediting rewards, and processing withdrawals, redemptions and purchases after Admin approval.`,
        `Preventing fraud, protecting system security, enforcing terms (such as per-IP registration limits and anomaly detection).`,
        `Customer support, notifications and account-related emails (email verification, password reset).`,
        `Complying with legal obligations and requests from competent authorities.`,
        `The legal bases are your consent, performance of the service you request, our legitimate security interests, and legal obligations.`,
      ],
    },
    {
      heading: `3. Data sharing`,
      paragraphs: [`We do not sell your personal data. Data is shared only as necessary with:`],
      items: [
        `Infrastructure and storage providers (hosting, database) and email delivery services.`,
        `Cloudflare Turnstile for captcha verification; Discord and Google when you choose to sign in with them.`,
        `Card/payment partners, only when an Admin approves your redemption or withdrawal request.`,
        `Shortlink providers: when you start a task, the provider may collect data under its own policy.`,
        `Competent state authorities upon a lawful request.`,
        `Your username and ranking figures may be shown publicly on leaderboards.`,
      ],
    },
    {
      heading: `4. Cookies and local storage`,
      items: [
        `A session cookie (httpOnly) keeps you securely signed in.`,
        `Browser storage keeps your language, light/dark theme and a temporary referral code.`,
        `We do not use third-party advertising tracking cookies. You can clear cookies in your browser, but you may need to sign in again.`,
      ],
    },
    {
      heading: `5. Storage and security`,
      items: [
        `Passwords are hashed with a one-way algorithm; sessions use signed tokens; sensitive APIs are rate-limited and protected by captcha.`,
        `We recommend enabling two-factor authentication. No system is perfectly secure; use a strong, unique password and never share verification codes.`,
        `Data is kept while your account is active and for a reasonable period afterward to resolve complaints, prevent fraud or comply with law, then deleted or anonymized when no longer needed.`,
        `If an incident affects personal data, we will handle and notify as required by law.`,
      ],
    },
    {
      heading: `6. International transfers`,
      items: [
        `Some infrastructure and third-party providers may host servers outside Vietnam. By using the Service you understand and agree that data may be processed abroad with appropriate safeguards.`,
      ],
    },
    {
      heading: `7. Your rights`,
      paragraphs: [`Under applicable law, you have the right to:`],
      items: [
        `Be informed, access and request a copy of your personal data.`,
        `Correct inaccurate data.`,
        `Withdraw consent, restrict or object to processing, and request deletion, except where the law permits or requires us to retain data.`,
        `Complain, sue or claim compensation as provided by law.`,
      ],
    },
    {
      heading: `8. Under 16`,
      items: [
        `The Service is for people aged 16 and over. If we find an account belonging to someone under 16, we may lock or delete the account and related data.`,
      ],
    },
    {
      heading: `9. Changes to this policy`,
      items: [
        `We may update this policy and will announce material changes on the website or in the app. Continued use after the effective date means you accept the update.`,
      ],
    },
    {
      heading: `10. Contact`,
      paragraphs: [`To exercise your rights or ask about personal data, submit a ticket on the Support page or use the contact details at the bottom of the page.`],
    },
  ],
};

const VI_ABOUT: LegalDoc = {
  title: `Về chúng tôi`,
  updated: ``,
  intro: `VietnamDong là nền tảng kiếm VNC bằng nhiệm vụ rút gọn link, điểm danh, vòng quay và giới thiệu bạn bè, sau đó quy đổi ra tiền mặt hoặc thẻ cào theo tỷ giá công khai.`,
  sections: [
    {
      heading: `Chúng tôi làm gì`,
      items: [
        `Cung cấp nhiều nhiệm vụ rút gọn link từ các nhà cung cấp khác nhau, hoàn thành xong nhận VNC.`,
        `Thưởng điểm danh theo chuỗi ngày, vòng quay may mắn, nhiệm vụ tuần/tháng và bảng xếp hạng.`,
        `Chương trình giới thiệu và Creator Code với hoa hồng minh bạch.`,
        `Vietsub Studio: công cụ làm vietsub dành cho người dùng mua khóa bản quyền.`,
      ],
    },
    {
      heading: `Cam kết minh bạch và an toàn`,
      items: [
        `Mọi giao dịch rút tiền, đổi thưởng và mua Vietsub Studio đều do Admin duyệt thủ công.`,
        `Tỷ giá VNC hiển thị công khai; lịch sử giao dịch của bạn luôn xem được và xuất được.`,
        `Bảo mật bằng Cloudflare Turnstile, giới hạn đăng ký theo IP, phát hiện bất thường và xác thực 2 lớp tùy chọn.`,
        `VNC là điểm thưởng nội bộ, không phải tiền tệ hay tài sản đầu tư. Chúng tôi không hứa hẹn mức thu nhập cố định.`,
      ],
    },
    {
      heading: `Liên hệ`,
      paragraphs: [`Cần giúp đỡ? Gửi ticket tại trang Hỗ trợ, hoặc dùng thông tin liên hệ ở cuối trang.`],
    },
  ],
};

const EN_ABOUT: LegalDoc = {
  title: `About us`,
  updated: ``,
  intro: `VietnamDong is a platform where you earn VNC through shortlink tasks, daily check-ins, the lucky wheel and referrals, then convert it to cash or top-up cards at a publicly shown rate.`,
  sections: [
    {
      heading: `What we do`,
      items: [
        `Offer shortlink tasks from multiple providers; finish a task and receive VNC.`,
        `Streak-based daily rewards, a lucky wheel, weekly/monthly quests and leaderboards.`,
        `A referral program and Creator Codes with transparent commissions.`,
        `Vietsub Studio: a subtitling tool for users who purchase a license key.`,
      ],
    },
    {
      heading: `Our commitment to transparency and safety`,
      items: [
        `Every withdrawal, redemption and Vietsub Studio purchase is manually approved by an Admin.`,
        `The VNC rate is publicly shown; your transaction history is always viewable and exportable.`,
        `Protection through Cloudflare Turnstile, per-IP registration limits, anomaly detection and optional two-factor authentication.`,
        `VNC is an internal reward point, not currency or an investment asset. We do not promise any fixed income.`,
      ],
    },
    {
      heading: `Contact`,
      paragraphs: [`Need help? Submit a ticket on the Support page, or use the contact details at the bottom of the page.`],
    },
  ],
};

export const LEGAL: Record<Lang, Record<LegalKind, LegalDoc>> = {
  vi: { terms: VI_TERMS, privacy: VI_PRIVACY, about: VI_ABOUT },
  en: { terms: EN_TERMS, privacy: EN_PRIVACY, about: EN_ABOUT },
};
