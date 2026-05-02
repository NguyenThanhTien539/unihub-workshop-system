const ContentSection = () => {
  const modules = [
    {
      title: "Module 1: Giới thiệu",
      items: [
        "Tổng quan về chủ đề",
        "Tầm quan trọng và ứng dụng thực tế",
        "Xu hướng hiện tại và tương lai"
      ]
    },
    {
      title: "Module 2: Kiến thức nền tảng",
      items: [
        "Các khái niệm cơ bản",
        "Phương pháp tiếp cận",
        "Best practices từ các chuyên gia"
      ]
    },
    {
      title: "Module 3: Thực hành",
      items: [
        "Case study thực tế",
        "Bài tập nhóm",
        "Demo và workshop hands-on"
      ]
    }
  ];

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Nội dung chi tiết</h2>

      <div className="space-y-10">
        {modules.map((module, index) => (
          <div key={index} className="group">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {module.title}
            </h3>
            <ul className="space-y-3">
              {module.items.map((item, i) => (
                <li key={i} className="flex items-start text-gray-600 pl-4 relative">
                  <span className="absolute left-0 top-2 w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  <span className="ml-2 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            {/* Đường kẻ ngăn cách giữa các module, trừ module cuối */}
            {index !== modules.length - 1 && (
              <div className="mt-10 border-b border-gray-100" />
            )}
          </div>
        ))}
      </div>

      {/* Phần Tài liệu (Blue Box) */}
      <div className="mt-12 bg-blue-50/50 p-6 rounded-xl border border-blue-50">
        <h4 className="text-[#1D4ED8] font-bold text-lg mb-2">Tài liệu</h4>
        <p className="text-[#3B82F6] text-sm md:text-base">
          Tất cả slide bài giảng và tài liệu tham khảo sẽ được gửi qua email sau workshop
        </p>
      </div>
    </div>
  );
};

export default ContentSection;