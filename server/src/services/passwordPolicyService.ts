import crypto from 'node:crypto';
import { HttpError } from '../utils/httpError.js';

const COMMON_PASSWORDS = new Set([
  '123456', '123456789', 'picture1', 'password', '12345678', '111111', '123123', '12345',
  '1234567', 'qwerty', '000000', '1234', '1234567890', 'admin', 'welcome', 'login',
  'iloveyou', 'sunshine', 'princess', 'football', 'monkey', 'charlie', 'donald', 'shadow',
  'master', 'michael', 'jessica', 'ashley', 'daniel', 'robert', 'thomas', 'william',
  '666666', '999999', '121212', 'abc123', 'password1', 'pass123', 'admin123', 'vietnam',
  'vietnam123', 'hanoi123', 'saigon123', 'dongnguoi', 'matkhau', 'matkhau123', 'thanhpho',
  'nguoiviet', 'congnghe', 'yeuemmai', 'khongbiet', '123456aA', 'Password@1', 'Admin@123',
  '654321', '7777777', '888888', 'starwars', 'dragon', 'baseball', 'superman', 'batman',
  'trustno1', 'killer', 'chelsea', 'arsenal', 'liverpool', 'barcelona', 'realmadrid',
  'pokemon', 'whatever', 'freedom', 'computer', 'orange', 'purple', 'yellow', 'summer',
  'winter', 'spring', 'autumn', 'october', 'december', 'november', 'forever', 'together',
  'secret', 'target', 'system', 'security', 'internet', 'database', 'network', 'server',
  'client', 'access', 'manage', 'account', 'profile', 'contact', 'service', 'payment',
  'transaction', 'finance', 'company', 'project', 'business', 'default', 'sample', 'tester',
  'testing', 'dev123', 'staging', 'production', 'operator', 'support', 'helpdesk', 'console',
  'terminal', 'command', 'monitor', 'desktop', 'laptop', 'android', 'windows', 'iphone',
  'samsung', 'huawei', 'xiaomi', 'oppo', 'google', 'facebook', 'twitter', 'discord',
  'telegram', 'youtube', 'github', 'amazon', 'netflix', 'spotify', 'roblox', 'tiktok',
  'minecraft', 'league', 'dota123', 'csgo123', 'valorant', 'overwatch', 'genshin', 'fifa123',
  'pubg123', 'freefire', 'lienquan', 'zingme', 'zalo123', 'tiki123', 'shopee', 'lazada',
  'momo123', 'vnpay123', 'vietcombank', 'techcombank', 'bidv123', 'agribank', 'vpbank123',
  'acbbank', 'mbbank123', 'tpbank123', 'sacombank', 'scbbank', 'hdbank123', 'shinhan',
  '0123456789', '987654321', '0123456', '54321', '123321', '6543210', '112233', '12121212',
  '123123123', '321321', '789456', '456789', '147258', '258369', '369258', '159357',
  '951753', '753951', '147852', '369852', '258147', '852963', '741852', '963852',
  'asdfgh', 'asdfghjkl', 'zxcvbnm', 'qwertz', 'azerty', 'poiu trewq', 'lkjhgfdsa', 'mnbvcxz',
  'qazwsx', 'wsxedc', 'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm', 'ujmikol', 'zaq12wsx',
  'xsw23edc', 'cde34rfv', 'vfr45tgb', 'bgt56yhn', 'nhy67ujm', 'mju78ik,', '1q2w3e4r',
  '1qaz2wsx', '3edc4rfv', '5tgb6yhn', '7ujm8ik,', 'q1w2e3r4', 'a1s2d3f4', 'z1x2c3v4',
  '00000000', '11111111', '22222222', '33333333', '44444444', '55555555', '66666666',
  '77777777', '88888888', '99999999', '01010101', '10101010', '20202020', '20212021',
  '20222022', '20232023', '20242024', '20252025', '20262026', 'aaaaaa', 'aaaa1111',
  'bbbbbb', 'cccccc', 'dddddd', 'eeeeee', 'ffffff', 'gggggg', 'hhhhhh', 'iiiiii', 'jjjjjj',
  'kkkkkk', 'llllll', 'mmmmmm', 'nnnnnn', 'oooooo', 'pppppp', 'qqqqqq', 'rrrrrr', 'ssssss',
  'tttttt', 'uuuuuu', 'vvvvvv', 'wwwwww', 'xxxxxx', 'yyyyyy', 'zzzzzz', 'abcabc', 'abcdef',
  'abcdefg', 'abcdefgh', 'abcdefghi', 'abcdefghij', '1234abcd', 'abcd1234', 'admin2024',
  'admin2025', 'admin2026', 'root1234', 'superadmin', 'administrator', 'operator1',
  'changeme', 'donttell', 'cannotguess', 'guessme', 'canttouchthis', 'letmein', 'opensesame',
  'passcode', 'security1', 'protectme', 'safe1234', 'securepass', 'keepsafe', 'guardme',
  'shield123', 'firewall', 'antivirus', 'malware', 'trojan', 'hacker', 'cracker', 'pentest',
  'developer', 'programmer', 'software', 'hardware', 'firmware', 'database1', 'sqladmin',
  'postgres', 'supabase', 'vercel123', 'docker123', 'kubernetes', 'linux123', 'ubuntu123',
  'debian123', 'centos123', 'redhat123', 'windows10', 'windows11', 'macos123', 'android12',
  'happy123', 'smile123', 'love1234', 'sweetheart', 'beautiful', 'honey123', 'angel123',
  'darling', 'lover123', 'romance', 'couple123', 'family12', 'mother12', 'father12',
  'sister12', 'brother1', 'daughter', 'firstborn', 'children', 'friend12', 'homie123',
  'buddy123', 'coffee12', 'tea12345', 'water123', 'beer1234', 'wine1234', 'drink123',
  'apple123', 'banana12', 'cherry12', 'orange12', 'mango123', 'lemon123', 'pizza123',
  'burger12', 'noodle12', 'pho12345', 'comtam12', 'banhmi12', 'bunbo123', 'buncha12',
  'hanoi2024', 'hanoi2025', 'saigon2024', 'saigon2025', 'danang12', 'cantho12', 'haiphong',
  'nhatrang', 'vungtau1', 'dalat123', 'huecity1', 'vietnam2024', 'vietnam2025', 'vietnam2026',
  'vietnamvn', 'congnghett', 'cntt1234', 'khoacntt', 'sinhvien', 'hocsinh1', 'truonghoc',
  'lophoc12', 'thaygiao', 'cogiao12', 'banbe123', 'giadinh1', 'quetoi12', 'datnuoc1',
  'toiyeuvn', 'vietnamoi', 'chienthang', 'thanhcong', 'phattailoc', 'taiphattat', 'phattai1',
  'locphat1', '68686868', '86868686', '79797979', '39393939', '11021102', '999999999',
  '12345678a', '12345678b', '12345678c', 'a12345678', 'b12345678', 'c12345678',
  'qwerty12', 'qwert123', 'zxcvb123', 'asdf1234', 'asdfgh12', 'mnbvc123', 'poiuy123',
  'lkjhg123', 'zaqwsx12', 'xswcde12', 'cdevfr12', 'vfrbgt12', 'bgtyhn12', 'yhnujm12',
  '0987654321', '098765432', '09876543', '0987654', '098765', '09876', '01234567',
  '012345678', '1234509876', '11112222', '22223333', '33334444', '44445555', '55556666',
  '66667777', '77778888', '88889999', '99990000', '12341234', '56785678', '11221122',
  '12344321', '56788765', '98766789', '1234554321', '123456654321', '01230123', '45674567',
  'password12', 'password123', 'password1234', 'password@123', 'admin@1234', 'root@123',
  'guest123', 'user1234', 'public12', 'test1234', 'demo1234', 'trial123', 'sample12'
]);

export async function validatePasswordPolicy(
  password: string,
  options?: { username?: string; email?: string }
): Promise<void> {
  const pwd = String(password || '');

  if (pwd.length < 8) {
    throw new HttpError(400, 'Mật khẩu phải có ít nhất 8 ký tự');
  }

  const pwdLower = pwd.toLowerCase();

  if (options?.username) {
    const userClean = options.username.toLowerCase().trim();
    if (userClean.length >= 3 && (pwdLower === userClean || pwdLower.includes(userClean))) {
      throw new HttpError(400, 'Mật khẩu không được chứa hoặc trùng với tên đăng nhập');
    }
  }

  if (options?.email) {
    const emailClean = options.email.toLowerCase().trim();
    const emailPrefix = emailClean.split('@')[0];
    if (pwdLower === emailClean || (emailPrefix && emailPrefix.length >= 3 && pwdLower.includes(emailPrefix))) {
      throw new HttpError(400, 'Mật khẩu không được chứa hoặc trùng với địa chỉ email');
    }
  }

  if (COMMON_PASSWORDS.has(pwdLower)) {
    throw new HttpError(400, 'Mật khẩu quá phổ biến và dễ bị đoán, vui lòng chọn mật khẩu khác an toàn hơn');
  }

  try {
    const sha1 = crypto.createHash('sha1').update(pwd).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VietnamDong-Security-Auditor',
        'Add-Padding': 'true',
      },
    }).catch(() => null);

    clearTimeout(timeout);

    if (res && res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts[0] && parts[0].trim().toUpperCase() === suffix) {
          throw new HttpError(400, 'Mật khẩu này đã bị rò rỉ trong các vụ lộ dữ liệu trên Internet, vui lòng chọn mật khẩu khác');
        }
      }
    }
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
  }
}
