import { Star } from 'lucide-react';

const AuthorSection = () => {
  const experiences = [
    "10+ năm kinh nghiệm trong lĩnh vực",
    "Diễn giả tại hơn 50 sự kiện quốc tế",
    "Tác giả của nhiều bài báo và nghiên cứu"
  ];

  const achievements = [
    "Top Expert 2025",
    "Award Winner",
    "Published Author"
  ];

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
      {/* Header: Avatar & Basic Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-6">
        {/* Avatar Placeholder */}
        <div className="w-24 h-24 md:w-32 md:h-32 bg-[#E9EAF0] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-3xl md:text-4xl text-gray-700 font-medium">D</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dr. Nguyễn Văn A
          </h2>
          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
            Tiến sĩ AI tại Google, 10 năm kinh nghiệm nghiên cứu Machine Learning
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-gray-100 mb-8" />

      {/* Experience Section */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Kinh nghiệm</h3>
        <ul className="space-y-3">
          {experiences.map((exp, index) => (
            <li key={index} className="flex items-center gap-3 text-gray-600">
              <Star size={18} className="text-yellow-500 fill-none" strokeWidth={2} />
              <span className="text-sm md:text-base">{exp}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Achievement Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Thành tựu</h3>
        <div className="flex flex-wrap gap-3">
          {achievements.map((tag, index) => (
            <span 
              key={index} 
              className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-xs md:text-sm text-gray-700 font-medium hover:border-gray-400 transition-colors cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthorSection;